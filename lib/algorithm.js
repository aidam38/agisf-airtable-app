import { Map, List, Set, hash } from "immutable";
import { shuffleImmutable, wait, insertSortByMut, insertSortByKeepLengthMut } from "./util.js";
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

export function intersectIntervalArrays(intervals1, intervals2) {
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

export function findOverlapGroup(people, config) {
    console.log(people);
    return people.reduce(intersectIntervalArrays)
}

export function findMeetingsGroup(people, config) {
    return findOverlapGroup(people, config)
        .filter(([x1, x2]) => x2 - x1 >= config.lengthOfMeeting)
}

export function findMeetings(_cohort, config) {
    const cohort = Map(_cohort)
    const people = List(cohort
        .get("participants"))
        .push(cohort.get("facilitator"))
        .map(p => p.timeAv)

    return findMeetingsGroup(people, config)
}

var fitGroupCache = {}
function fitGroup(people, config) {
    const ids = Set(people.map(p => p.get("id")))
    const h = hash(ids)
    if (fitGroupCache[h]) {
        return fitGroupCache[h]
    }
    const timeAvs = people.map(p => p.get("timeAv"))
    const meetings = findMeetingsGroup(timeAvs, config)

    let res
    if (meetings.length > 0) {
        res = 1
    } else {
        res = 0
    }
    fitGroupCache[h] = res
    return res
}

var fitCohortCache = {}
function hashCohort(cohort) {
    const allPeople = cohort
        .get("participants")
        .map(p => p.update("id", id => "p" + id))
        .push(cohort.get("facilitator").update("id", id => "f" + id))

    const ids = Set(allPeople.map(p => p.get("id")))
    return hash(ids)
}

function fitCohort(cohort, config) {
    const h = hashCohort(cohort)
    if (fitCohortCache[h]) {
        return fitCohortCache[h]
    }

    const allPeople = cohort
        .get("participants")
        .map(p => p.update("id", id => "p" + id))
        .push(cohort.get("facilitator").update("id", id => "f" + id))

    let score = 0
    const n = allPeople.size
    for (let k = 2; k <= n; k++) {
        const subgroups = [...(new Combination(allPeople, k))]
        const multiplier = 1 / combination(n, k)
        score += multiplier * subgroups.reduce((agg, subgroup) => {
            return agg + fitGroup(subgroup, config)
        }, 0)
    }
    let finalScore = score / (n - 1)
    fitCohortCache[h] = finalScore
    return finalScore
}

var fitSolutionCache = {}
function hashSolution(solution) {
    return hash(Set(solution.map(hashCohort)))
}

function fitSolution(solution, config) {
    if (!solution) { return 0 }
    const h = hashSolution(solution)
    if (fitSolutionCache[h]) {
        return fitSolutionCache[h]
    }

    const res = solution.reduce((agg, cohort) => agg + fitCohort(cohort, config), 0) / solution.size
    fitSolutionCache[h] = res
    return res

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

    // first check whether we can even satisfy the required cohort sizes 
    // with the given participants
    let cohortCounts = coinProblem(participants.length, config.cohortSizes)
    if (!cohortCounts) {
        return { error: "Couldn't partition the number of participants into cohorts of the right sizes. Consider adding more participants to the view or adding more possible cohort sizes" }
    }

    // check if we have enough facilitators
    if (facilitators.length < cohortCounts.reduce((ag, c) => ag + c, 0)) {
        return { error: "Not enough facilitators." }
    }

    // build an array whose length is the same as the total number of cohorts
    // we'll have and each element is the size of the cohort
    let cohortNumbers = []
    for (let i = 0; i < cohortCounts.length; i++) {
        cohortNumbers = cohortNumbers.concat(Array(cohortCounts[i]).fill(config.cohortSizes[i]));
    }

    // convert everything to immutable.js data structures
    facilitators = List(facilitators.map(f => Map(f)))
    participants = List(participants.map(p => Map(p)))

    // create closures for functions which require the config
    const fitSolution2 = (solution) => fitSolution(solution, config)

    // size of generation
    let n = config.numberOfGenerations
    // initialize first generation
    let currentGeneration = [];
    for (let i = 0; i < n; i++) {
        insertSortByMut(currentGeneration, fitSolution2, generateRandomSolution({ facilitators, participants }, cohortNumbers, config))
    }

    let deadEnds = []

    let g = 0
    do {
        // print current generation
        uilog("Generation: " + g + ", Fit: " + JSON.stringify(currentGeneration.map(fitSolution2).map(n => n.round(2))))
        console.log(currentGeneration.map(hashSolution));
        await wait(1)

        // initialize next generation to be current generation
        let nextGeneration = []
        g += 1

        // take current generation, for each member:
        // (1) generate its neighbors
        //    a. for each neighbor, push it into the next generation
        // Note: pushing into next generation means either inserting it
        // into the right position if its fit is within the first n (and flushing the n+1-th solution)
        for (let i = 0; i < currentGeneration.length; i++) {
            const solution = currentGeneration[i];
            if (deadEnds.some(deadEnd => hashSolution(deadEnd) == hashSolution(solution))) {
                continue
            }

            const fit = fitSolution2(solution)
            const neighbors = findNeighbors(solution, config)

            if (neighbors.every(neighbor => fitSolution2(neighbor) <= fit)) {
                deadEnds.push(solution)
            }

            for (const neighbor of neighbors) {
                if (!nextGeneration.some(s => hashSolution(s) == hashSolution(neighbor))) {
                    insertSortByKeepLengthMut(nextGeneration, n, fitSolution2, neighbor)
                }
            }
        }
        if (nextGeneration.length == 0) {
            break
        }

        // make current generation be next generation
        currentGeneration = nextGeneration
    } while (fitSolution2(currentGeneration[currentGeneration.length - 1]) != 1 && runningGlobal)

    // return best solution
    const bestSolution = currentGeneration[currentGeneration.length - 1]

    uilog("almost")
    await wait(50)

    // just one solution
    // let solution = generateRandomSolution({ facilitators, participants }, cohortNumbers, config)
    uilog("ending")
    return bestSolution?.map(c => c.toJS()).toJS();
}

export async function solve_dfs(input, config, uilog) {
    if (!input || !config) {
        return { error: "Invalid input or config!" }
    }
    let { facilitators, participants } = input

    // first check whether we can even satisfy the required cohort sizes 
    // with the given participants
    let cohortCounts = coinProblem(participants.length, config.cohortSizes)
    if (!cohortCounts) {
        return { error: "Couldn't partition the number of participants into cohorts of the right sizes. Consider adding more participants to the view or adding more possible cohort sizes" }
    }

    // check if we have enough facilitators
    if (facilitators.length < cohortCounts.reduce((ag, c) => ag + c, 0)) {
        return { error: "Not enough facilitators." }
    }

    // build an array whose length is the same as the total number of cohorts
    // we'll have and each element is the size of the cohort
    let cohortNumbers = []
    for (let i = 0; i < cohortCounts.length; i++) {
        cohortNumbers = cohortNumbers.concat(Array(cohortCounts[i]).fill(config.cohortSizes[i]));
    }

    // convert everything to immutable.js data structures
    facilitators = List(facilitators.map(f => Map(f)))
    participants = List(participants.map(p => Map(p)))

    // create closures for functions which require the config
    const fitSolution2 = (solution) => fitSolution(solution, config)

    let bestSolution = generateRandomSolution({ facilitators, participants }, cohortNumbers, config)
    let bestFit = fitSolution2(bestSolution)
    let foundFull = false

    let discovered = []
    const dfs = async (solution, h) => {
        if (foundFull || !runningGlobal) { return }

        const fit = fitSolution2(solution)
        if (fit == 1) {
            bestSolution = solution
            foundFull = true
            return
        }
        else if (fit > bestFit) {
            bestSolution = solution
            bestFit = fit
            uilog("Current fit: " + bestFit.round(3))
            await wait(1)
        }

        discovered.unshift(h)
        const neighbors = List(findNeighbors(solution))
        for (const neighbor of neighbors.sortBy(sol => -fitSolution2(sol))) {
            const hn = hashSolution(neighbor)
            if (!discovered.some(disHash => disHash == hn)) {
                await dfs(neighbor, hn)
            }
            if (foundFull || !runningGlobal) { return }
        }
    }

    await dfs(bestSolution, hashSolution(bestSolution))

    return bestSolution?.map(c => c.toJS()).toJS();
}

export async function solve_dfs2(input, config, uilog) {
    if (!input || !config) {
        return { error: "Invalid input or config!" }
    }
    let { facilitators, participants } = input

    // first check whether we can even satisfy the required cohort sizes 
    // with the given participants
    let cohortCounts = coinProblem(participants.length, config.cohortSizes)
    if (!cohortCounts) {
        return { error: "Couldn't partition the number of participants into cohorts of the right sizes. Consider adding more participants to the view or adding more possible cohort sizes" }
    }

    // check if we have enough facilitators
    if (facilitators.length < cohortCounts.reduce((ag, c) => ag + c, 0)) {
        return { error: "Not enough facilitators." }
    }

    // build an array whose length is the same as the total number of cohorts
    // we'll have and each element is the size of the cohort
    let cohortNumbers = []
    for (let i = 0; i < cohortCounts.length; i++) {
        cohortNumbers = cohortNumbers.concat(Array(cohortCounts[i]).fill(config.cohortSizes[i]));
    }

    // convert everything to immutable.js data structures
    facilitators = List(facilitators.map(f => Map(f)))
    participants = List(participants.map(p => Map(p)))

    // create closures for functions which require the config
    const fitSolution2 = (solution) => fitSolution(solution, config)




    let solution = generateRandomSolution({ facilitators, participants }, cohortNumbers, config)
    let fit = fitSolution2(solution)
    let h = hashSolution(solution)

    let bestSolution
    let bestFit = 0

    let discovered = []
    let i = 0
    while (runningGlobal) {
        // log
        i += 1
        uilog("[" + i + "] Current best fit: " + bestFit.round(4) + "   #" + h)
        await wait(1)

        if (fit == 1) {
            bestSolution = solution
            break
        }
        // update best fit
        if (fit > bestFit) {
            bestSolution = solution
            bestFit = fit
        }

        // mark as discovered
        discovered.unshift(h)

        // choose best undiscovered neighbor
        const neighbors = List(findNeighbors(solution))

        for (const neighbor of neighbors.sortBy(sol => -fitSolution2(sol))) {
            const hn = hashSolution(neighbor)
            if (!discovered.some(disHash => disHash == hn)) {
                solution = neighbor
                fit = fitSolution2(solution)
                h = hashSolution(solution)
                break
            }
        }
    }

    return bestSolution?.map(c => c.toJS()).toJS();
}

export async function solve_brute_force(input, config, uilog) {
    if (!input || !config) {
        return { error: "Invalid input or config!" }
    }
    let { facilitators, participants } = input

    // first check whether we can even satisfy the required cohort sizes 
    // with the given participants
    let cohortCounts = coinProblem(participants.length, config.cohortSizes)
    if (!cohortCounts) {
        return { error: "Couldn't partition the number of participants into cohorts of the right sizes. Consider adding more participants to the view or adding more possible cohort sizes" }
    }

    // check if we have enough facilitators
    if (facilitators.length < cohortCounts.reduce((ag, c) => ag + c, 0)) {
        return { error: "Not enough facilitators." }
    }

    // build an array whose length is the same as the total number of cohorts
    // we'll have and each element is the size of the cohort
    let cohortNumbers = []
    for (let i = 0; i < cohortCounts.length; i++) {
        cohortNumbers = cohortNumbers.concat(Array(cohortCounts[i]).fill(config.cohortSizes[i]));
    }

    // convert everything to immutable.js data structures
    facilitators = List(facilitators.map(f => Map(f)))
    participants = List(participants.map(p => Map(p)))

    await uilog("getting all possible cohorts")
    let allGroupsOfParticipants = []
    for (const k of config.cohortSizes) {
        if (!runningGlobal) return
        allGroupsOfParticipants = allGroupsOfParticipants.concat([...new Combination(participants, k)])
    }

    let allPossibleCohorts = [...new CartesianProduct(facilitators, allGroupsOfParticipants)]
        .map(([f, ps]) => Map({ facilitator: f, participants: List(ps) }))

    await uilog("filtering cohorts")

    let allAdmissibleCohorts = []
    for (let i = 0; i < allPossibleCohorts.length; i++) {
        if (!runningGlobal) return

        if (i % 10000 == 0) {
            await uilog("filtering cohorts: " + i + "/" + allPossibleCohorts.length)
        }

        const cohort = allPossibleCohorts[i];
        const people = cohort
            .get("participants")
            .map(p => p.update("id", id => "p" + id))
            .push(cohort.get("facilitator").update("id", id => "f" + id))

        const timeAvs = people.map(p => p.get("timeAv"))
        if (findMeetingsGroup(timeAvs, config).length == 1) {
            allAdmissibleCohorts.push(cohort)
        }

    }

    // convert cohorts
    await uilog("converting " + allAdmissibleCohorts.length + "cohorts")
    allAdmissibleCohorts = allAdmissibleCohorts.map((cohort, i) => {
        const people = Set(cohort
            .get("participants")
            .map(p => "p" + p.get("id"))
            .push("f" + cohort.get("facilitator").get("id")))

        return { people: people, index: i, size: people.size - 1 }
    })

    await uilog("looking for disjoint solutions among " + allAdmissibleCohorts.length)

    const search = async (cohorts) => {
        if (!runningGlobal) return []

        if (cohorts.length > 2) {
            await uilog("looking for disjoint solutions among " + cohorts.length + "/" + allAdmissibleCohorts.length)
        }

        if (cohorts.length == 1) {
            return [[], cohorts]
        }

        const n = cohorts.length
        const h = Math.round(n / 2)
        const half1 = cohorts.slice(0, h)
        const half2 = cohorts.slice(h)
        const disjoint1 = await search(half1)
        const disjoint2 = await search(half2)

        let res = []
        for (const d1 of disjoint1) {
            loop1:
            for (const d2 of disjoint2) {

                for (const c1 of d1) {
                    for (const c2 of d2) {
                        if (Set.intersect([c1.people, c2.people]).size > 0) {
                            continue loop1
                        }
                    }
                }
                res.push(d1.concat(d2))
            }
        }

        console.log(res.length);
        return res
    }


    const solutions = await search(allAdmissibleCohorts)

    console.log(solutions);

    return
    //return bestSolution?.map(c => c.toJS()).toJS();
}

export function pickATime(intervals, { lengthOfMeeting }) {
    const [s, e] = intervals[Math.floor(Math.random() * intervals.length)];

    return [s, s + parseInt(lengthOfMeeting)]
}