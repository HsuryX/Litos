;(function () {
  var formatter = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })
  var FETCH_TIMEOUT_MS = 6000

  function hydrateCards() {
    var cards = document.querySelectorAll('.card-github.fetch-waiting')
    cards.forEach(function (card) {
      var repo = card.getAttribute('data-repo')
      if (!repo) return
      card.classList.remove('fetch-waiting')
      card.classList.add('fetch-in-flight')

      // 用 AbortController 兜住慢速/挂死的 GitHub API：6 秒没回就当失败，避免卡片永远停在 in-flight。
      var controller = new AbortController()
      var timer = setTimeout(function () {
        controller.abort()
      }, FETCH_TIMEOUT_MS)

      fetch('https://api.github.com/repos/' + repo, { referrerPolicy: 'no-referrer', signal: controller.signal })
        .then(function (res) {
          clearTimeout(timer)
          if (!res.ok) throw new Error('GitHub API request failed')
          return res.json()
        })
        .then(function (data) {
          var desc = card.querySelector('.gc-description')
          if (desc) {
            var cleanDescription = (data.description || '').replace(/:[a-zA-Z0-9_]+:/g, '')
            desc.textContent = cleanDescription || 'No description available'
          }

          var starsSpan = card.querySelector('.gc-stars span')
          if (starsSpan) starsSpan.textContent = formatter.format(data.stargazers_count || 0)

          var forksSpan = card.querySelector('.gc-forks span')
          if (forksSpan) forksSpan.textContent = formatter.format(data.forks || 0)

          var licenseSpan = card.querySelector('.gc-license span')
          if (licenseSpan) licenseSpan.textContent = (data.license && data.license.spdx_id) || 'No License'

          var avatar = card.querySelector('.gc-avatar')
          if (avatar && data.owner && data.owner.avatar_url) {
            avatar.style.backgroundImage = 'url(' + data.owner.avatar_url + ')'
            avatar.style.backgroundColor = 'transparent'
          }

          card.classList.remove('fetch-in-flight')
        })
        .catch(function () {
          clearTimeout(timer)
          card.classList.remove('fetch-in-flight')
          card.classList.add('fetch-error')
          var desc = card.querySelector('.gc-description')
          if (desc) desc.textContent = 'Failed to load repository information'
        })
    })
  }

  if (document.readyState !== 'loading') {
    hydrateCards()
  } else {
    document.addEventListener('DOMContentLoaded', hydrateCards)
  }
  document.addEventListener('astro:page-load', hydrateCards)
})()
