// ;<svg class='snippet_svg'>
//   <circle class='snippet_circle'></circle>
// </svg>
const query = document.querySelector.bind(document),
  queryAll = document.querySelectorAll.bind(document),
  navLinks = query('.nav_links'),
  storeHours = query('.store_hours'),
  gradientContainer = query('.gradient_container'),
  storeHoursKey = 'storeHours',
  snippetDefaultChild = query('#snippet_text').cloneNode(true),
  hoursDefaultHTML = query('#hours_text').cloneNode(true)
let storeHoursInterval, placeDetailsResult

// Nav animation functions.
function showNav() {
  navLinks.classList.add('show')
  gradientContainer.classList.add('over', 'dark')
  for (const node of queryAll('.nav_a')) node.removeAttribute('tabindex')
}
function hideNav() {
  navLinks.classList.remove('show')
  gradientContainer.classList.remove('over', 'dark')
  for (const node of queryAll('.nav_a')) node.setAttribute('tabindex', -1)
}
/**
 * @param {Event} event
 */
function toggleNav(event) {
  const { target } = event,
    bars = query('.bars')

  if (
    // @ts-ignore
    bars?.contains(target)
  )
    // Nav_links covers .bars when shown, so no need to check that the nav is hidden, as the user could not click .bars otherwise.
    return showNav()

  // @ts-ignore
  if (!navLinks?.contains(target) && navLinks.classList.contains('show'))
    hideNav()
}

// Store hours animation functions.
function showStoreHours() {
  // Add .show to storeHours, and .over to gradient_container
  hideNav()
  storeHours.classList.remove('hide')
  storeHours.classList.add('show')
  gradientContainer.classList.add('over', 'dark')
  query('#google_hours_link')?.removeAttribute('tabindex')
}
function hideStoreHours() {
  storeHours.classList.add('hide')
  storeHours.classList.remove('show')
  gradientContainer.classList.remove('over', 'dark')
  query('#google_hours_link')?.setAttribute('tabindex', -1)
}
/**
 * @param {Event} event
 */
function toggleStoreHours(event) {
  // Call showStoreHours if hours_snippet contains the target.
  // Call hideStoreHours if storeHours does NOT contain the target, & it contains the class 'show'
  const { target } = event,
    snippet = query('.hours_snippet')

  if (snippet?.contains(target)) return showStoreHours()

  if (!storeHours?.contains(target) && storeHours.classList.contains('show'))
    hideStoreHours()
}

// Store hours data functions.
/**
 * @description Returns whether the current weekday in MDT time is a Sunday.
 * @param {Date} date Defaults to the current date.
 * @returns {boolean}
 */
function isMDTSunday(date = new Date()) {
  // Return whether: the current UTC day is Sunday, and the hour is 07 or later; OR, whether the current UTC day is Monday, & the hour is before 07.
  const UTCWeekday = date.getUTCDay(),
    UTCHour = date.getUTCHours()

  return (UTCWeekday === 0 && UTCHour >= 7) || (UTCWeekday === 1 && UTCHour < 7)
}
/**
 * @description Returns a boolean indicating whether at least a day has passed between the two date arguments.
 * @param {Date} date1
 * @param {Date} date2 Defaults to the current date.
 * @returns {boolean}
 */
function dayHasPassed(date1, date2 = new Date()) {
  const msInADay = 86_400_000

  return Math.abs(date2.getTime() - date1.getTime()) >= msInADay
}
/**
 * @description Returns a boolean indicating whether at least a week has passed since the two date arguments.
 * @param {Date} date1
 * @param {Date} date2 Defaults to the current date.
 * @returns {boolean}
 */
function weekHasPassed(date1, date2 = new Date()) {
  const msInAWeek = 604_800_000

  return Math.abs(date2.getTime() - date1.getTime()) >= msInAWeek
}
function updateOpeningHours() {
  const mapQuery = query('.map')
  let map
  if (mapQuery instanceof Element) map = mapQuery
  else {
    map = document.createElement('iframe')
    map.allowFullscreen = true
    map.src =
      'https://www.google.com/maps/embed/v1/place?key=AIzaSyACH4gzkvAoGmlWtjhlFGexBndnTfPgNmw&q=2255+32+St+NE+Unit+3110,+Calgary,+AB+T1Y+6E8'
    map.classList.add('map')
    map.setAttribute('loading', 'lazy')
    map.setAttribute('referrerpolicy', 'no-referrer-when-downgrade')
  }

  const service = new google.maps.places.PlacesService(map)

  service.getDetails(
    {
      placeId: 'ChIJawKDKGBlcVMRqEUhscr_ATk',
      fields: ['opening_hours', 'utc_offset_minutes'],
    },
    (place, status) => {
      if (
        status !== google.maps.places.PlacesServiceStatus.OK ||
        place.opening_hours === undefined ||
        place.utc_offset_minutes === undefined
      ) {
        console.error('cannot fetch store hours:', status)
        return updateStoreHoursHTML()
      }

      placeDetailsResult = place
      localStorage.setItem(storeHoursKey, JSON.stringify(place.opening_hours))
      updateStoreHoursHTML(
        place.opening_hours.isOpen() ? 'open' : 'closed',
        place.opening_hours.weekday_text
      )
    }
  )
}
function checkForOldStoreHours() {
  const storeHoursDataString = localStorage.getItem(storeHoursKey)
  let storeHoursData, lastFetchDate
  try {
    // @ts-ignore
    storeHoursData = JSON.parse(storeHoursDataString)
    lastFetchDate = new Date(storeHoursData?.lastFetchDate)
  } catch (error) {
    // Update hours, since stringified data in local storage is not parseable, and is therefore invalid.
    return updateOpeningHours()
  }

  if (
    Object.keys(storeHoursData || {}).length === 0 ||
    // Verifying lastFetchDate is a valid date.
    isNaN(lastFetchDate.getDay()) ||
    (isMDTSunday() && dayHasPassed(lastFetchDate)) ||
    weekHasPassed(lastFetchDate)
  )
    updateOpeningHours()
}
/**
 * @description Updates store hours html (snippet at bottom left & store_hours section) to either open, closed, or default values.
 * @param {string} [value] A string, either 'open' or 'closed', indicating which value to set the store to. If undefined, values are set back to default.
 * @param {array} [storeHours] An array containing strings indicating the week's opening/closing hours.
 */
function updateStoreHoursHTML(value, storeHours) {
  // use placeDetails to check if the store is open or closed. If a boolean is not returned, reset values back to default.
  if (typeof placeDetailsResult !== 'object')
    return console.error(
      'could not update store hours snippet - store hours not in storage'
    )
  const svg = query('#snippet_svg'),
    circle = query('#snippet_circle')

  if (value === 'open') {
    const pContent = `Open -&nbsp;<a class="open_text link">Business Hours</a>`,
      storeHoursList = storeHours
        ?.map(weekdayHours => `<li>${weekdayHours}</li><br><br>`)
        .join('')

    svg.classList.remove('no_display')
    circle.classList.add('open')
    query('#snippet_text').innerHTML = pContent
    query('#store_hours').innerHTML = storeHoursList
    return
  }
  if (value === 'closed') {
    const pContent = `Closed -&nbsp;<a class="open_text link">Business Hours</a>`,
      storeHoursList = storeHours
        ?.map(weekdayHours => `<li>${weekdayHours}</li><br><br>`)
        .join('')

    svg.classList.remove('no_display')
    circle.classList.add('closed')
    query('#snippet_text').innerHTML = pContent
    query('#store_hours').innerHTML = storeHoursList
    return
  }

  query('#store_hours').innerHTML = hoursDefaultHTML
  query('#snippet').innerHTML = snippetDefaultChild
}
function setCheckStoreHoursInterval() {
  clearInterval(storeHoursInterval)
  checkForOldStoreHours()
  storeHoursInterval = setInterval(checkForOldStoreHours, 60_000)
}

query('#placesApiScript').onload = setCheckStoreHoursInterval
document.body.addEventListener('pointerdown', toggleNav)
document.body.addEventListener('pointerdown', toggleStoreHours)
