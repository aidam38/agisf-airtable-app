import { Map, List } from "immutable";

function canPersonMeet(person, time) {
    for (const i of person.timeeAv) {
        if (i[0] <= time && i[1] >= time) {
            return true;
        }
    }
    return false;
}

function expandTimes(person) {
    let times = [];
    for (const i of person.timeAv) {
        for (let t = i[0]; t < i[1]; t++) {
            times.push(t);
        }
    }
    return times;
}

function histogram(times) {
    let counts = {};

    for (const t of times) {
        if (!(t in counts)) {
            counts[t] = 0;
        }
        counts[t] += 1;
    }

    let sorted = [];

    for (const [key, value] of Object.entries(counts)) {
        sorted.push([key, value]);
    }

    sorted.sort((a, b) => {
        if (a[1] > b[1])
            return 1;
        else if (a[1] < b[1])
            return -1;
        else
            return 0;
    });

    return sorted;
}

function makeLargeGroups(facilitators, participants) {
    let people = facilitators.concat(participants)
    let times = people.map(expandTimes);
    let hist = histogram(times);

    let groups = {}

    for (const time of hist.map((a) => a[0] )) {
        for (let p of people) {
            if (canPersonMeet(p, time)) {
                if (!groups[time]) {
                    groups[time] = []
                }
                groups[time].push(p.id);
            }
        }
    }

    // List of arrays with [time [person id, person id, person id, ...]]
    return List(Object.entries(groups));
}

// Return true if the given number of people can be divided into
//  cohorts using the configured size preference...
function divisible(n, config) {
    for (let s of config.cohortSizes) {
        n %= s;
    }
    return n == 0;
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

// Find the least popular group which does not have a suitable number of
//  participants to form a cohort.
// Return the index of that group or null if no such group is found.
function findInsufficientGroup(groups, config, i) {
    for (; i >= 0; i--) {
        // groups[i] = [time, [person id, person id, ...]]
        if (!divisible(groups[i][1].size, config)) {
            return i;
        }
    }
    return null;
}

// Find a participant who can move into the group with the given
//  time. Returns [group index, person index] or null if no such
//  person exists.
function findMatch(groups, time) {
    for (let gi = 0; gi < groups.size; gi++) {
        // dont search people who are already in the given time...
        if (groups[gi][0] == time)
            continue;
        for (let pi = 0; pi < groups[gi][1].size; pi++) {
            if (canPersonMeet(groups[gi][1][pi], time)) {
                return [gi, pi];
            }
        }
    }
    return null;
}

// Find groups which currently cannot form cohorts (not enough people...)
//  and move people from the more populated groups into them...
function fillLargeGroups(groups, config) {
    let g = findInsufficientGroup(groups, config, groups.size-1);
    while (g) {
        let p = findMatch(groups, g[0]);
        if (!p) {
            // Couldn't find anyone to fill this group...
            continue;
        }
        g = findInsufficientGroup(groups, config, g-1);12
    }
}

// Divide the large groups into cohorts.
// This will likely happen randomly while consulting a scoring function to
//  find the best solution.
function makeCohorts(groups, config) {

}

//                      input                       , config
export function solve({ facilitators, participants }, config, uilog) {
    console.log(facilitators.toJS(), participants.toJS());      
}