;(async function () {
  if (window.pagefind) return
  var pagefind = await import('/pagefind/pagefind.js')
  await pagefind.options({ excerptLength: 20, showSubResults: true })
  pagefind.init()
  window.pagefind = pagefind
  pagefind.search('')
})()
