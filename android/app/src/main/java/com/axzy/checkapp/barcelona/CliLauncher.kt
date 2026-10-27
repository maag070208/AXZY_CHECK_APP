package com.axzy.checkapp.barcelona

import android.app.Activity
import android.content.Intent
import android.os.Bundle

/**
 * Entrada exclusiva para el CLI de React Native (`run-android`).
 * El CLI busca una <activity> con MAIN/LAUNCHER en el manifest principal;
 * en release esta actividad queda deshabilitada y el launcher real son los
 * activity-alias por rol.
 */
class CliLauncher : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    startActivity(Intent(this, MainActivity::class.java))
    finish()
  }
}
