package com.axzy.checkapp.barcelona

import android.animation.Animator
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.ImageView
import androidx.appcompat.app.AppCompatActivity
import com.airbnb.lottie.LottieAnimationView

/**
 * Splash de arranque: reproduce el Lottie de CheckApp sobre el verde de marca.
 * Al terminar (o si la animación falla, por timeout) abre MainActivity.
 */
class SplashActivity : AppCompatActivity() {

  private val handler = Handler(Looper.getMainLooper())
  private var launched = false

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    val green = Color.parseColor("#12A36F")
    window.statusBarColor = green
    window.navigationBarColor = green

    val root = FrameLayout(this).apply { setBackgroundColor(green) }
    val animation = LottieAnimationView(this).apply {
      setAnimation("checkapp-icon.json")
      repeatCount = 0
      speed = 1.8f
      scaleType = ImageView.ScaleType.CENTER_INSIDE
      layoutParams = FrameLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.MATCH_PARENT,
        Gravity.CENTER,
      )
      addAnimatorListener(object : Animator.AnimatorListener {
        override fun onAnimationStart(animation: Animator) = Unit
        override fun onAnimationCancel(animation: Animator) = Unit
        override fun onAnimationRepeat(animation: Animator) = Unit
        override fun onAnimationEnd(animation: Animator) = goToApp()
      })
      playAnimation()
    }

    root.addView(animation)
    setContentView(root)

    // Respaldo: si el archivo Lottie no carga o el listener no dispara.
    handler.postDelayed({ goToApp() }, 4000)
  }

  private fun goToApp() {
    if (launched) return
    launched = true
    handler.removeCallbacksAndMessages(null)
    startActivity(Intent(this, MainActivity::class.java))
    finish()
  }

  override fun onDestroy() {
    handler.removeCallbacksAndMessages(null)
    super.onDestroy()
  }
}
