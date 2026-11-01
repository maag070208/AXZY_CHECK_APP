package com.axzy.checkapp.barcelona

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec
import kotlin.concurrent.thread

/**
 * PBKDF2-SHA256 nativo para el verificador de login offline. En JavaScript las mismas
 * vueltas bloquean la interfaz más de un minuto en un teléfono de gama media.
 */
class PasswordHashModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {

  override fun getName() = "PasswordHash"

  @ReactMethod
  fun pbkdf2Sha256(password: String, salt: String, iterations: Int, promise: Promise) {
    thread(name = "password-hash") {
      try {
        promise.resolve(derive(password, salt, iterations))
      } catch (error: Exception) {
        promise.reject("PASSWORD_HASH_ERROR", error)
      }
    }
  }

  // Un solo bloque de 32 bytes. Se opera sobre bytes UTF-8 para coincidir exacto con @noble/hashes;
  // `SecretKeyFactory` con SHA-256 no existe antes de Android 8 y aquí el mínimo es Android 7.
  private fun derive(password: String, salt: String, iterations: Int): String {
    val mac = Mac.getInstance(ALGORITHM)
    mac.init(SecretKeySpec(password.toByteArray(Charsets.UTF_8), ALGORITHM))

    var round = mac.doFinal(salt.toByteArray(Charsets.UTF_8) + byteArrayOf(0, 0, 0, 1))
    val result = round.copyOf()
    repeat(iterations - 1) {
      round = mac.doFinal(round)
      for (index in result.indices) {
        result[index] = (result[index].toInt() xor round[index].toInt()).toByte()
      }
    }
    return result.joinToString("") { "%02x".format(it) }
  }

  private companion object {
    const val ALGORITHM = "HmacSHA256"
  }
}
