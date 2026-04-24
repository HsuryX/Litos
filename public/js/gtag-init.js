;(function () {
  var el = document.currentScript
  var id = el && el.dataset ? el.dataset.gaId : ''
  if (!id) return
  window.dataLayer = window.dataLayer || []
  function gtag() {
    window.dataLayer.push(arguments)
  }
  gtag('js', new Date())
  gtag('config', id)
})()
