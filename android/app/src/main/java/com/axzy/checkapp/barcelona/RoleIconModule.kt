package com.axzy.checkapp.barcelona

import android.content.ComponentName
import android.content.Context
import android.content.pm.PackageManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Cambia el alias de launcher activo según el rol. Android no permite cambiar
 * el icono de una actividad en caliente; se habilitan/deshabilitan los alias
 * declarados en AndroidManifest.xml.
 */
class RoleIconModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {

  override fun getName() = "RoleIcon"

  private val aliases = mapOf(
    "ADMIN" to "RoleAliasAdmin",
    "SHIFT" to "RoleAliasShift",
    "GUARD" to "RoleAliasGuard",
    "RESDN" to "RoleAliasResdn",
    "MAINT" to "RoleAliasMaint",
  )

  @ReactMethod
  fun setRole(role: String?, promise: Promise) {
    try {
      val normalized = role?.uppercase()?.takeIf { aliases.containsKey(it) } ?: "ADMIN"
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .edit()
        .putString(ROLE_KEY, normalized)
        .apply()

      val pm = context.packageManager
      val target = ComponentName(context.packageName, "${context.packageName}.${aliases.getValue(normalized)}")

      // Primero habilitamos el destino para no quedarnos sin launcher.
      pm.setComponentEnabledSetting(
        target,
        PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
        PackageManager.DONT_KILL_APP,
      )
      aliases.filterValues { it != aliases.getValue(normalized) }.values.forEach { name ->
        pm.setComponentEnabledSetting(
          ComponentName(context.packageName, "${context.packageName}.$name"),
          PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
          PackageManager.DONT_KILL_APP,
        )
      }
      promise.resolve(normalized)
    } catch (error: Exception) {
      promise.reject("ROLE_ICON_ERROR", error)
    }
  }

  companion object {
    const val PREFS = "checkapp_prefs"
    const val ROLE_KEY = "role"
  }
}
