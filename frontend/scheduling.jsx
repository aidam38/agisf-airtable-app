import React, { Fragment, useState } from 'react';
import {
    ViewPickerSynced,
    FormField,
    InputSynced,
    Button,
    useGlobalConfig,
    useBase,
    useRecords
} from "@airtable/blocks/ui";
import { parseTimeAvString, parseTimeAvString2, findSolution, findMeetings, stringifyIntervalRich, fitSolution, wait } from "../lib/util"
import { Set, Map, List } from 'immutable';
import { solve } from "../lib/algorithm"

function PersonBlob({ name }) {
    return (
        <div className="rounded px-1 bg-blue-50 h-5">{name}</div>
    )
}

function Solution({ solution, config }) {
    const cohorts = solution.map(cohort => cohort.merge(Map({ meetings: findMeetings(cohort, config) })))

    return (
        <div>
            <div className="w-full rounded border border-solid border-gray-200">
                <div className="flex bg-slate-100 py-1 font-medium">
                    <div className="w-1/5 px-2">Facilitator</div>
                    <div className="w-2/5 px-2">Participants</div>
                    <div className="w-2/5 px-2">Meeting times</div>
                </div>
                <div className="w-full bg-white divide-y divide-gray-200">
                    {cohorts.map(cohort => {
                        const facilitatorName = cohort.getIn(["facilitator", "name"])
                        const participantsNames = cohort.get("participants").map(p => p.get("name"))
                        const meetings = cohort.get("meetings").map(stringifyIntervalRich)

                        return (
                            <div className="flex">
                                <div className="h-6 my-1 overflow-hidden w-1/5">
                                    <div className="flex w-full">
                                        <PersonBlob name={facilitatorName} />
                                    </div>
                                </div>
                                <div className="h-6 my-1 overflow-hidden w-2/5">
                                    <div className="flex w-full space-x-1">
                                        {participantsNames.map(n => <PersonBlob name={n} />)}
                                    </div>
                                </div>
                                <div className="h-6 my-1 overflow-hidden w-2/5">{meetings.join(", ")}</div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

function Solver({ participants, facilitators, config }) {
    let [results, setResults] = useState([])
    const addResult = result => {
        setResults(results.concat([result]))
    }

    let [currentResult, setCurrentResult] = useState(0)
    const decCurrentResult = () => {
        if (currentResult > 0) {
            setCurrentResult(currentResult - 1)
        }
    }
    const incCurrentResult = () => {
        if (currentResult < results.length - 1) {
            setCurrentResult(currentResult + 1)
        }
    }

    const currentResultLast = () => {
        setCurrentResult(results.length)
    }

    let [running, setRunning] = useState(false)
    let [console, setConsole] = useState()
    const uilog = (out) => setConsole(out)
    const input = {
        facilitators: facilitators,
        participants: participants
    }

    return (
        <div className="space-y-2">
            <div className="flex space-x-2 items-center">
                {!running ?
                    <Button
                        variant='secondary'
                        icon="play"
                        onClick={async () => {
                            setConsole("")
                            setRunning(true)
                            addResult(await solve(input, config, uilog))
                            currentResultLast()
                            setRunning(false)
                            setConsole("")
                        }}>Run algorithm</Button>
                    : <Button
                        variant='secondary'
                        icon="italic"
                        onClick={async () => {
                            setRunning(false)
                            setConsole("")
                        }}>Stop algorithm</Button>
                }
                <span className="font-mono">{console}</span>
            </div>
            {currentResult >= 0 && results[currentResult] &&
                <React.Fragment>
                    <Solution solution={results[currentResult]} config={config} />
                    <div className="flex justify-between">
                        <div>
                            {results.length > 1 &&
                                <div>
                                    <Button icon="chevronLeft" onClick={decCurrentResult}></Button>
                                    {currentResult + 1}/{results.length}
                                    <Button icon="chevronRight" onClick={incCurrentResult}></Button>
                                </div>}
                        </div>
                        <Button>Accept</Button>
                    </div>
                </React.Fragment>
            }
        </div >
    )

    return (
        <div className="space-y-2">
            <Button variant="secondary"
                icon="play"
                onClick={async () => {
                    setConsole("")
                    setRunning(true)
                    setResult(await solve(input, config, null))
                    setRunning(false)
                }}>
                Run algorithm
            </Button>
            {running ?
                <div className="space-y-2">
                    <Solution solution={result} config={config} />
                    <div className="flex justify-end">
                        <Button icon="right" onClick={() => console.log(result?.toJS())}>Accept</Button>
                    </div>
                </div>
                : <div className="border border-slid border-slate-500 rounded bg-white h-48 overflow-scroll">
                </div>}
        </div>)
}

export function Scheduling() {
    const base = useBase()
    const globalConfig = useGlobalConfig()
    const facilitatorTable = base.getTableById(globalConfig.get("facilitatorTable"))
    const participantsTable = base.getTableById(globalConfig.get("participantsTable"))

    const requiredKeys = ["facilitatorTableView", "participantsTableView", "lengthOfMeeting"]
    const isConfigured = requiredKeys.every(key => globalConfig.get(key))

    const increment = Map({ hours: 0, minutes: 30 })

    let facilitators;
    let participants;
    let config;

    if (isConfigured) {
        // get an array of facilitators and participants
        const facilitatorView = facilitatorTable.getViewById(globalConfig.get("facilitatorTableView"))
        const participantView = participantsTable.getViewById(globalConfig.get("participantsTableView"))

        facilitators = List(useRecords(facilitatorView, { fields: [globalConfig.get("facilitatorTableTimeAvField")] })
            .map(record => {
                return Map({
                    id: record.id,
                    name: record.name,
                    timeAv: parseTimeAvString2(record.getCellValue(globalConfig.get("facilitatorTableTimeAvField")), increment)
                })
            }))

        participants = List(useRecords(participantView, { fields: [globalConfig.get("participantsTableTimeAvField")] })
            .map(record => {
                return Map({
                    id: record.id,
                    name: record.name,
                    timeAv: parseTimeAvString2(record.getCellValue(globalConfig.get("participantsTableTimeAvField")), increment)
                })
            }))


        config = {
            cohortSizes: [5, 4],
            lengthOfMeeting: globalConfig.get("lengthOfMeeting"),
            increment: increment
        }
    }


    return (
        <div>
            <div>
                <div className="text-lg">Configuration</div>
                <div className="flex space-x-4">
                    <div className="w-1/2" >
                        <FormField label="Facilitator table view">
                            <ViewPickerSynced
                                table={facilitatorTable}
                                globalConfigKey="facilitatorTableView"
                            />
                        </FormField>
                        <FormField label="Participants table view">
                            <ViewPickerSynced
                                table={participantsTable}
                                globalConfigKey="participantsTableView"
                            />
                        </FormField>
                    </div>
                    <div className="w-1/2" >
                        <FormField label="Length of meeting">
                            <InputSynced
                                type="number"
                                globalConfigKey="lengthOfMeeting" />
                        </FormField>
                    </div>
                </div>
            </div>
            {isConfigured ?
                <Solver participants={participants} facilitators={facilitators} config={config} />
                : <div>Please configure the algorithm above first.</div>}
        </div>
    )
}