import { Map, List } from "immutable";
import { shuffleImmutable, wait } from "./util.js";
import { Combination, combination } from "./combinatorics.js";
import _ from "lodash"

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

function intersectIntervals([x1, x2], [y1, y2]) {
    if (x1 > y2 || x2 < y1) {
        return null
    } else {
        return [Math.max(x1, y1), Math.min(x2, y2)]
    }
}

function intersectIntervalArrays(intervals1, intervals2) {
    if (!intervals1) {
        return intervals2
    }
    let result = []
    for (const interval1 of intervals1) {
        for (const interval2 of intervals2) {
            const intersection = intersectIntervals(interval1, interval2)
            if (intersection) {
                result.push(intersection)
            }
        }
    }
    return result
}

function findMeetingsGroup(people, config) {
    let intersections = people.reduce(intersectIntervalArrays)
    return intersections.filter(([x1, x2]) => x2 - x1 >= config.lengthOfMeeting)
}

export function findMeetings(_cohort, config) {
    const cohort = Map(_cohort)
    const people = List(cohort
        .get("participants"))
        .push(cohort.get("facilitator"))
        .map(p => p.timeAv)

    return findMeetingsGroup(people, config)
}

function fitGroup(people, config) {
    const meetings = findMeetingsGroup(people, config)

    if (meetings.length > 0) {
        return 1
    } else {
        return 0
    }
}

function fitCohort(cohort, config) {
    let score = 0

    const allPeople = cohort
        .get("participants")
        .push(cohort.get("facilitator"))
        .map(p => p.get("timeAv"))

    const n = allPeople.size
    for (let k = 2; k <= n; k++) {
        const subgroups = [...(new Combination(allPeople, k))]
        const multiplier = 1 / combination(n, k)
        score += multiplier * subgroups.reduce((agg, subgroup) => {
            return agg + fitGroup(subgroup, config)
        }, 0)
    }
    return score / (n - 1)
}

function fitSolution(solution, config) {
    if (!solution) {
        return Number.NEGATIVE_INFINITY
    } else {
        return solution.reduce((agg, cohort) => agg + fitCohort(cohort, config), 0) / solution.size
    }
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

function findNeighbors(solution, config) {
    let neighbors = []
    const indexes = _.range(solution.size)
    const pairs = [...(new Combination(indexes, 2))]
    for (let [i1, i2] of pairs) {
        const cohort1 = solution.get(i1)
        const cohort2 = solution.get(i2)
        for (let j1 of _.range(cohort1.get("participants").size)) {
            for (let j2 of _.range(cohort2.get("participants").size)) {
                const participant1 = cohort1.getIn(["participants", j1])
                const participant2 = cohort2.getIn(["participants", j2])
                neighbors.push(solution.withMutations(solution => {
                    return solution
                        .setIn([i1, "participants", j1], participant2)
                        .setIn([i2, "participants", j2], participant1)
                }))
            }
        }
    }
    return neighbors
}

import { runningGlobal } from "../frontend/scheduling.jsx";
export async function solve(input, config, uilog) {
    if (!input || !config) {
        return "wrong input"
    }
    let { facilitators, participants } = input
    uilog("starting")
    await wait(50)

    let cohortCounts = coinProblem(participants.length, config.cohortSizes)
    if (!cohortCounts) {
        return { error: "Couldn't partition the number of participants into cohorts of the right sizes. Consider adding more participants to the view or adding more possible cohort sizes" }
    }

    if (facilitators.length <= cohortCounts.reduce((ag, c) => ag + c, 0)) {
        return { error: "Not enough facilitators." }
    }

    let cohortNumbers = []
    for (let i = 0; i < cohortCounts.length; i++) {
        cohortNumbers = cohortNumbers.concat(Array(cohortCounts[i]).fill(config.cohortSizes[i]));
    }

    facilitators = List(facilitators.map(f => Map(f)))
    participants = List(participants.map(p => Map(p)))

    uilog("middle")
    await wait(50)

    let bestFit = 0
    let solution;
    while (bestFit != 1) {
        solution = generateRandomSolution({ facilitators, participants }, cohortNumbers, config)
        let curFit;
        let foundImprovement = true
        while (foundImprovement && runningGlobal) {
            foundImprovement = false
            curFit = fitSolution(solution, config)
            const neighbors = findNeighbors(solution, config)

            uilog(" Current fit: " + curFit)
            await wait(1)

            for (const neighbor of neighbors) {
                if (!runningGlobal) {
                    break
                }
                let newFit = fitSolution(neighbor, config)
                if (newFit > curFit) {
                    solution = neighbor
                    curFit = newFit
                    foundImprovement = true
                }
            }
        }
        bestFit = 1
    }
    uilog("almost")
    await wait(50)

    // just one solution
    // let solution = generateRandomSolution({ facilitators, participants }, cohortNumbers, config)
    uilog("ending")
    return solution?.map(c => c.toJS()).toJS();
}