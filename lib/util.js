import _ from 'lodash';
import { Set, Map, List, Range } from 'immutable';
import { Combination } from './combinatorics.js';

export async function wait(time) {
    if (!time) { time = 1000 }
    await new Promise(r => setTimeout(r, time));
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

export function isWithin(interval, n) {
    if (interval[0] <= n && n <= interval[1]) {
        return true;
    }
}

function parseTime2(time) {
    let [hour, minute] = time.split(":")
    return parseInt(hour) + parseInt(minute) / 60
}

function parseInterval2(interval, multiplier) {
    const [a, d1, t1, d2, t2] = interval.match(/(M|T|W|R|F|S|U)(\d+:\d+) (M|T|W|R|F|S|U)(\d+:\d+)/) || []
    let [b, e] = [[d1, t1], [d2, t2]].map(([d, t]) => {
        return (dayMapping[d] * 24 + parseTime2(t)) * multiplier
    })
    if (b > e) {
        e = 7 * 24 * multiplier
    }
    return [b, e]
}

export function unparseNumber(n, multiplier) {
    n = n / multiplier
    const day = Math.floor(n / 24)
    n -= day * 24
    const hour = Math.floor(n)
    n -= hour
    const minute = n * 60
    return {
        day: day,
        hour: hour,
        minute: minute
    }
}

export function unparseInterval(interval, multiplier) {
    return interval.map(n => unparseNumber(n, multiplier))
}

export function prettyPrintTime({ hour, minute }) {
    return padNumber(hour, 2) + ":" + padNumber(minute, 2)
}

export function prettyPrintCoord({ day, hour, minute }) {
    return dayMappingInverted[day] + prettyPrintTime({ hour, minute })
}

export function prettyPrintInterval(interval, { increment }) {
    const multiplier = 1 / durationToHours(increment)
    return unparseInterval(interval, multiplier).map(prettyPrintCoord).join(" ")
}

export function prettyPrintIntervals(intervals, config) {
    if (intervals.length == 0) {
        return ""
    }
    return intervals.map(i => prettyPrintInterval(i, config)).join(", ")
}

export function parseTimeAvString2(timeAv, { increment }) {
    if (!timeAv) return null
    const multiplier = 1 / durationToHours(increment)
    return timeAv.split(", ")
        .map(ts => parseInterval2(ts, multiplier))
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

function stringifyInterval({ start, end }) {
    return stringifyCoord(start) + " " + stringifyCoord(end)
}

export function stringifyIntervalRich(interval) {
    return String(stringifyInterval(interval) + " (" + durationToHours(intervalToDuration(interval))) + "h)"
}

Number.prototype.round = function (places) {
    return +(Math.round(this + "e+" + places) + "e-" + places);
}

export function durationToHours({ hour, minute }) {
    return (hour + minute / 60).round(2)
}

export function insertSortByMut(array, keyFn, el) {
    const keyEl = keyFn(el)
    let i = 0
    while (keyEl > keyFn(array[i]) && i < array.length) {
        i += 1
    }
    array.splice(i, 0, el)
}

// inserts element to a sorted array while keeping its
// total length (i.e. dropping some elements),
// sorted by the keyFn function
export function insertSortByKeepLengthMut(array, n, keyFn, el) {
    const keyEl = keyFn(el)
    const key0 = keyFn(array[0])
    if (keyEl < key0) {
        return
    }
    insertSortByMut(array, keyFn, el)
    array.splice(0, Math.max(array.length - n, 0))
}

export function getNextNMondays(n) {
    let monday = new Date("2022-01-31T00:00:00Z")
    let mondays = []
    for (let i = 0; i < n; i++) {
        mondays.push(monday)
        monday = new Date(monday.getTime());
        monday.setDate(monday.getDate() + 7)
    }
    return mondays
}

export function getDates(meeting, startDate, config) {
    const multiplier = 1 / durationToHours(config.increment)
    const [startCoord, endCoord] = unparseInterval(meeting, multiplier)

    let start = new Date(startDate.getTime())
    start.setDate(start.getDate() + startCoord.day)
    start.setUTCHours(startCoord.hour)
    start.setUTCMinutes(startCoord.minute)
    let end = new Date(startDate.getTime())
    end.setDate(end.getDate() + endCoord.day)
    end.setUTCHours(endCoord.hour)
    end.setUTCMinutes(endCoord.minute)

    return [start, end]
}