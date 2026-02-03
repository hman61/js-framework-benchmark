const Timer = {
    time: {},
    totResults: [],
    version: 'v0.98.8',
    start(name, version) {
        if (!Timer.time[name]) {
            Timer.time[name] = [globalThis.performance.now()]
        }
        Timer.version = version
    },
    stop(name) {
        const round = (name, dec = 3) => {
            const num = Timer.time[name][1] - Timer.time[name][0]
            const result = Math.round(num * Math.pow(10, dec)) / Math.pow(10, dec)
            return result
        }

        if (Timer.time[name]) {
            Timer.time[name].push(globalThis.performance.now())

            if (name === 'clear') {
                globalThis.document.title = 'c:' + round(name) + ' |' + globalThis.document.title
                Timer.time[name] = undefined
            }
            if (name === 'build') {
                globalThis.document.title = 'b:' + round(name) + ' ' + globalThis.document.title
                Timer.time[name] = undefined
            }
            if (name === 'tot') {
                const result = round(name)
                Timer.totResults.push(result)
                if (Timer.totResults.length >= 6) {
                    const results = Timer.totResults.slice(1, 6)
                    const avg = results.reduce((a, b) => a + b, 0) / results.length
                    // eslint-disable-next-line no-undef
                    console.log(Timer.version, "Avg.", avg, results)
                    Timer.totResults = []
                }
                Timer.time[name] = undefined
            }
            if (name === 'add') {
                globalThis.document.title = 'a:' + round(name) + ' ' + globalThis.document.title
                Timer.time[name] = undefined
            }
        }
    }
}
const _random = max => Math.trunc(Math.random() * max)

const adjectives = ["pretty____", "large_____", "big_______", "small_____", "tall______", "short_____", "long______", "handsome__", "plain_____", "quaint____", "clean_____", "elegant___", "easy______", "angry_____", "crazy_____", "helpful___", "mushy______", "odd_______", "unsightly_", "adorable__", "important_", "inexpensive", "cheap_____", "expensive_", "fancy_____"]
const colours = ["red___", "yellow", "blue__", "green_", "pink__", "brown_", "purple", "brown_", "white_", "black_", "orange"]
const nouns = ["table___", "chair___", "house___", "bbq_____", "desk____", "car_____", "pony____", "cookie__", "sandwich", "burger__", "pizza___", "mouse___", "keyboard"]

export { Timer, _random, adjectives, colours, nouns }

// Expose Timer to window/globalThis for testing
if (typeof globalThis !== 'undefined') {
    if (globalThis.window !== undefined) {
        globalThis.window.Timer = Timer;
    }
    globalThis.Timer = Timer;
}