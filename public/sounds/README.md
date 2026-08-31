Drop a short (< 1s) `arrive.mp3` here and the landing page plays it when a
visitor picks one of the three choices.

It fires on the click, never on page load: browsers block audible autoplay
without a user gesture, and unsolicited sound on arrival is the fastest way
to lose someone. If the file is missing the page stays silent — no error,
no console noise.
