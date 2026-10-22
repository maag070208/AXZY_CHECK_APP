package com.checkapp.speech

import android.content.Intent
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

class SpeechModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var recognizer: SpeechRecognizer? = null

    override fun getName() = "SpeechRecognition"

    private fun emit(event: String, payload: WritableMap) {
        if (reactApplicationContext.hasActiveReactInstance()) {
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(event, payload)
        }
    }

    private fun emitText(event: String, text: String) {
        val payload = Arguments.createMap()
        payload.putString("text", text)
        emit(event, payload)
    }

    private fun emitError(message: String) {
        val payload = Arguments.createMap()
        payload.putString("message", message)
        emit("SpeechRecognitionError", payload)
    }

    private fun errorMessage(code: Int): String = when (code) {
        SpeechRecognizer.ERROR_AUDIO -> "No se pudo leer el micrófono."
        SpeechRecognizer.ERROR_CLIENT -> "El dictado se canceló."
        SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Falta permiso de micrófono."
        SpeechRecognizer.ERROR_NETWORK,
        SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Sin conexión para reconocer la voz."
        SpeechRecognizer.ERROR_NO_MATCH -> "No se entendió. Intenta de nuevo."
        SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "El dictado está ocupado. Espera un momento."
        SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "No se detectó voz."
        else -> "No se pudo dictar. Intenta de nuevo."
    }

    @ReactMethod
    fun startListening() {
        UiThreadUtil.runOnUiThread {
            try {
                if (!SpeechRecognizer.isRecognitionAvailable(reactApplicationContext)) {
                    emitError("El dictado no está disponible en este dispositivo.")
                    return@runOnUiThread
                }

                recognizer?.destroy()
                recognizer = SpeechRecognizer.createSpeechRecognizer(reactApplicationContext).apply {
                    setRecognitionListener(object : RecognitionListener {
                        override fun onReadyForSpeech(params: Bundle?) {}
                        override fun onBeginningOfSpeech() {}
                        override fun onRmsChanged(rmsdB: Float) {}
                        override fun onBufferReceived(buffer: ByteArray?) {}
                        override fun onEndOfSpeech() {}

                        override fun onError(error: Int) {
                            emitError(errorMessage(error))
                        }

                        override fun onResults(results: Bundle?) {
                            val text = results
                                ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                                ?.firstOrNull()
                                ?.trim()
                                .orEmpty()
                            if (text.isNotEmpty()) emitText("SpeechRecognitionResult", text)
                            else emitError("No se detectó voz.")
                        }

                        override fun onPartialResults(partialResults: Bundle?) {
                            val text = partialResults
                                ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                                ?.firstOrNull()
                                ?.trim()
                                .orEmpty()
                            if (text.isNotEmpty()) emitText("SpeechRecognitionPartial", text)
                        }

                        override fun onEvent(eventType: Int, params: Bundle?) {}
                    })
                }

                val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                    putExtra(
                        RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                        RecognizerIntent.LANGUAGE_MODEL_FREE_FORM
                    )
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE, "es-MX")
                    putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                    putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
                }
                recognizer?.startListening(intent)
            } catch (error: Exception) {
                emitError(error.message ?: "No se pudo iniciar el dictado.")
            }
        }
    }

    @ReactMethod
    fun stopListening() {
        UiThreadUtil.runOnUiThread { recognizer?.stopListening() }
    }

    @ReactMethod
    fun destroy() {
        UiThreadUtil.runOnUiThread {
            recognizer?.destroy()
            recognizer = null
        }
    }
}
