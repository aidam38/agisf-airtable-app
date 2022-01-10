import _ from 'lodash';
import { Set, Map, List, Range } from 'immutable';
import { Combination } from '../frontend/combinatorics.js';

export async function wait(time) {
    if (!time) { time = 1000 }
    await new Promise(r => setTimeout(r, time));
}

const dayMapping = {
    "M": 0,
    "T": 1,
    "W": 2,
    "R": 3,
    "F": 4,
    "S": 5,
    "U": 6
}

const dayMappingInverted = {
    0: "M",
    1: "T",
    2: "W",
    3: "R",
    4: "F",
    5: "S",
    6: "U"
}

function parseTime(time) {
    let [hours, minutes] = time.split(":")
    return Map({
        hours: parseInt(hours),
        minutes: parseInt(minutes)
    })
}

export function parseInterval(interval) {
    let [a, d1, t1, d2, t2] = interval.match(/(M|T|W|R|F|S|U)(\d+:\d+) (M|T|W|R|F|S|U)(\d+:\d+)/) || []
    return Map({
        start: Map({
            day: dayMapping[d1],
            time: parseTime(t1)
        }),
        end: Map({
            day: dayMapping[d2],
            time: parseTime(t2)
        })
    })
}

function incrementTime(time, increment) {
    let _minutes = time.get("minutes") + increment.get("minutes");
    let newMinutes = _minutes % 60;
    let newHours = time.get("hours") + increment.get("hours") + Math.floor(_minutes / 60);

    return Map({
        hours: newHours % 24,
        minutes: newMinutes
    })
}

function timeIsBefore(time1, time2) {
    return time1.get("hours") < time2.get("hours") ||
        (time1.get("hours") == time2.get("hours") && time1.get("minutes") < time2.get("minutes"))
}

function coordIsBefore(coord1, coord2) {
    return coord1.get("day") < coord2.get("day") ||
        (coord1.get("day") == coord2.get("day") && timeIsBefore(coord1.get("time"), coord2.get("time")))
}

function incrementCoord(coord, increment) {
    const time = coord.get("time");
    const day = coord.get("day");

    let newTime = incrementTime(time, increment)
    let newDay = timeIsBefore(newTime, time) ? day + 1 : day;
    return Map({
        day: newDay % 7,
        time: newTime
    })
}

function generateTimes(interval, increment) {
    let time = Map(interval.get("start"));
    let times = List()
    let i = 0
    do {
        i += 1
        if (i > 10000) {
            return { error: "Loop timed out" }
        }
        times = times.push(time);
        time = incrementTime(time, increment)
    } while (!time.equals(interval.get("end")))
    return times;
}

export function generateAllTimes(increment) {
    return generateTimes(Map({
        start: Map({ hours: 0, minutes: 0 }),
        end: Map({ hours: 23, minutes: 30 })
    }), increment)
}

export function generateCoords(interval, increment) {
    let coord = Map(interval.get("start"));
    let coords = Set()
    let i = 0
    while (!coord.equals(interval.get("end"))) {
        i += 1
        if (i > 10000) {
            return { error: "Loop timed out" }
        }
        coords = coords.add(coord);
        coord = incrementCoord(coord, increment)
    }
    return coords;
}

export function genererateAllCoords(increment) {
    const allCoords = []
    let time = Map({ hours: 0, minutes: 0 })

    do {
        for (let d = 0; d < 7; d++) {
            allCoords.push(Map({ day: d, time: time }))
        }
        time = incrementTime(time, increment)
    } while (!time.equals(Map({ hours: 0, minutes: 0 })));

    return allCoords
}

export function parseTimeAvString(timeav, increment) {
    if (!timeav) return null
    return timeav.split(", ")
        .map(ts => parseInterval(ts))
        .reduce((coords, interval) => coords.concat(generateCoords(interval, increment)), Set())
}

function parseTime2(time) {
    let [hours, minutes] = time.split(":")
    return parseInt(hours) + parseInt(minutes) / 60
}

function parseInterval2(interval, multiplier) {
    const [a, d1, t1, d2, t2] = interval.match(/(M|T|W|R|F|S|U)(\d+:\d+) (M|T|W|R|F|S|U)(\d+:\d+)/) || []
    return [[d1, t1], [d2, t2]].map(([d, t]) => {
        const [hours, minutes] = t.split(":")
        return dayMapping[d] * 24 + (parseInt(hours) + parseInt(minutes) / 60) * multiplier
    })
}

export function parseTimeAvString2(timeAv, increment) {
    if (!timeAv) return null
    const multiplier = 1 / durationToHours(increment)
    return timeAv.split(", ")
        .map(ts => parseInterval2(ts, multiplier))
}

function serializeSet(set, increment) {
    return List(set)
        .sort((a, b) => !coordIsBefore(a, b))
        .reduce((agg, coord) => {
            if (agg.last()?.get("end").equals(coord)) {
                return agg.setIn([agg.size - 1, "end"], incrementCoord(coord, increment))
            } else {
                return agg.push(Map({ start: coord, end: incrementCoord(coord, increment) }))
            }
        }, List())
}

function findIntersection(people, increment) {
    const intersection = Set.intersect(people) // the slowest part of the whole algorithm
    if (!intersection) {
        return { error: "No intersection whatsoever!" }
    }

    return serializeSet(intersection, increment)
}

function padNumber(n, k) {
    return String(n).padStart(k, '0')
}

export function stringifyTime(time) {
    return padNumber(time.get("hours"), 2) + ":" + padNumber(time.get("minutes"), 2)
}

function stringifyCoord(coord) {
    return dayMappingInverted[coord.get("day")] + stringifyTime(coord.get("time"))
}

function stringifyInterval(interval) {
    return stringifyCoord(interval.get("start")) + " " + stringifyCoord(interval.get("end"))
}

export function stringifyIntervalRich(interval) {
    return String(stringifyInterval(interval) + " (" + durationToHours(intervalToDuration(interval))) + "h)"
}

function findMeetingsPeople(people, { increment, lengthOfMeeting }) {
    const intervals = findIntersection(people, increment)

    const minDurationInHours = durationToHours(increment) * lengthOfMeeting
    return intervals.filter(interval => durationToHours(intervalToDuration(interval)) > minDurationInHours)
}

export function findMeetings(cohort, config) {
    const people = cohort
        .get("participants")
        .push(cohort.get("facilitator"))
        .map(p => p.get("timeAv"))

    return findMeetingsPeople(people, config)
}

Number.prototype.round = function (places) {
    return +(Math.round(this + "e+" + places) + "e-" + places);
}

function durationToHours(time) {
    return (time.get("hours") + time.get("minutes") / 60).round(2)
}

// from: https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffle(array) {
    let currentIndex = array.length, randomIndex;

    // While there remain elements to shuffle...
    while (currentIndex != 0) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }

    return array;
}

export function shuffleImmutable(array) {
    return List(shuffle(array.toArray()))
}

function generateRandomSolution({ facilitators, participants }, cohortNumbers, config) {
    facilitators = shuffleImmutable(facilitators)
    participants = shuffleImmutable(participants)

    let cohorts = []
    cohortNumbers.forEach(n => {
        let cohort = Map({
            facilitator: facilitators.first(),
            participants: participants.take(n),
        })
        facilitators = facilitators.shift();
        participants = participants.skip(n)
        cohorts.push(cohort)
    })
    return List(cohorts)
}

function timePlus(time1, time2) {
    let _minutes = time1.get("minutes") + time2.get("minutes");
    let newMinutes = _minutes % 60;
    let newHours = time1.get("hours") + time2.get("hours") + Math.floor(_minutes / 60);

    return Map({
        hours: newHours,
        minutes: newMinutes
    })
}

function timeMinus(time1, time2) {
    let _minutes = time1.get("minutes") - time2.get("minutes");
    let newMinutes = _minutes % 60;
    let newHours = time1.get("hours") - time2.get("hours") + Math.floor(_minutes / 60);

    return Map({
        hours: newHours,
        minutes: newMinutes
    })
}

// TODO: implement intervals spanning more than two days
function intervalToDuration(interval) {
    let dayDiff = interval.getIn(["end", "day"]) - interval.getIn(["start", "day"])
    if (dayDiff < 0) {
        dayDiff += 7
    } else if (dayDiff == 0) {
        return timeMinus(interval.getIn(["end", "time"]), interval.getIn(["start", "time"]))
    } else {
        return timePlus(timeMinus(Map({ hours: 24, minutes: 0 }), interval.getIn(["start", "time"])),
            timeMinus(interval.getIn(["end", "time"]), Map({ hours: 0, minutes: 0 })))
    }
}

function fitCohort(cohort, config) {
    let score = 0

    const minDurationInHours = durationToHours(config.increment) * config.lengthOfMeeting

    const allPeople = cohort
        .get("participants")
        .push(cohort.get("facilitator"))
        .map(p => p.get("timeAv"))

    for (let n = 2; n <= allPeople.size; n++) {
        const combinations = new Combination(allPeople, n)
        score += [...combinations]
            .reduce((agg1, people) => {
                return agg1 +
                    findMeetingsPeople(people, config)
                        .reduce((agg2, meeting) => {
                            // tweak
                            const multiplier = n == allPeople.length ? n * n : n;
                            return agg2 +
                                durationToHours(intervalToDuration(meeting)) / minDurationInHours * multiplier
                        }, 0)
            }, 0)
    }

    return score
}

export function fitSolution(solution, config) {
    if (!solution) {
        return 0
    } else {
        return solution.reduce((agg, cohort) => agg + fitCohort(cohort, config), 0)
    }
}

function findNeighbors(solution, config) {
    const possiblePairs = new Combination(Range(0, solution.size), 2)
    const a = [...possiblePairs].flatMap(([i, j]) => {
        const cohort1 = solution[i]
        const cohort2 = solution[j]

        let solutions = []
        for (const person1 of cohort1) {
            for (const person2 of cohort2) {
                solutions.push(solution.withMutations(sol => {
                    sol.set()
                }))
            }
        }
    });
}

function coinProblem(n, [s1, s2]) {
    let c1 = Math.floor(n / s1)
    while ((n - c1 * s1) % s2 !== 0 && (n - c1 * s1) >= 0) {
        c1 -= 1
    }
    let c2 = (n - c1 * s1) / s2
    if (c1 >= 0 && c2 >= 0) {
        return [c1, c2]
    }
}

export async function findSolution({ facilitators, participants }, config) {
    let cohortCounts = coinProblem(participants.size, config.cohortSizes)
    if (!cohortCounts) {
        return { error: "Couldn't partition the number of participants into cohorts of the right sizes. Consider adding more participants to the view or adding more possible cohort sizes" }
    }

    if (facilitators.length >= cohortCounts.reduce((ag, c) => ag + c, 0)) {
        return { error: "Not enough facilitators." }
    }

    let cohortNumbers = []
    for (let i = 0; i < cohortCounts.length; i++) {
        cohortNumbers = cohortNumbers.concat(Array(cohortCounts[i]).fill(config.cohortSizes[i]));
    }

    let solution = generateRandomSolution({ facilitators, participants }, cohortNumbers, config)

    return solution;
}

export function uilog(s) {
    console.log(s);
}