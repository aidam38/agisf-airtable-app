import React, { Fragment, useState, useEffect } from 'react';
import {
    ViewPickerSynced,
    FormField,
    InputSynced,
    Button,
    useGlobalConfig,
    useBase,
    useRecords,
    expandRecord,
    Dialog
} from "@airtable/blocks/ui";
import { parseTimeAvString2, wait, prettyPrintIntervals } from "../lib/util"
import { solve, findMeetings } from "../lib/algorithm.js"

function PersonBlob({ name }) {
    return (
        <div className="rounded px-1 bg-blue-50 h-5">{name}</div>
    )
}

function Solution({ solution, config }) {
    if(solution.error) {
        return <div>{solution.error}</div>
    }
    const cohorts = solution.map(cohort => {
        let meetings = { meetings: findMeetings(cohort, config) }
        return { ...cohort, ...meetings }
    })

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
                        const facilitatorName = cohort.facilitator.name
                        const participantsNames = cohort.participants.map(p => p.name)
                        const meetings = prettyPrintIntervals(cohort.meetings, config)

                        return (
                            <div key={facilitatorName} className="flex">
                                <div className="h-6 my-1 overflow-hidden w-1/5">
                                    <div className="flex w-full">
                                        <PersonBlob name={facilitatorName} />
                                    </div>
                                </div>
                                <div className="h-6 my-1 overflow-hidden w-2/5">
                                    <div className="flex w-full space-x-1">
                                        {participantsNames.map(n => <PersonBlob key={n} name={n} />)}
                                    </div>
                                </div>
                                <div className="h-6 my-1 overflow-hidden w-2/5">{meetings}</div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export var runningGlobal = false
function Solver({ input, config, acceptFn }) {
    let [results, setResults] = useState([])
    const addResult = result => {
        setResults(results.concat([result]))
    }

    let [currentResult, setCurrentResult] = useState()
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
    let [con, setConsole] = useState()
    const uilog = (out) => {
        setConsole(out)
    }

    let [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false)

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
                            runningGlobal = true
                            addResult(await solve(input, config, uilog))
                            currentResultLast()
                            setRunning(false)
                            runningGlobal = false
                            setConsole("")
                        }}>Run algorithm</Button>
                    : <Button
                        variant='secondary'
                        icon="italic"
                        onClick={async () => {
                            setRunning(false)
                            runningGlobal = false
                            setConsole("")
                        }}>Stop algorithm</Button>
                }
                <span className="font-mono">{con}</span>
            </div>
            {currentResult >= 0 && results[currentResult] &&
                <React.Fragment>
                    <Solution solution={results[currentResult]} config={config} />
                    <div className="flex justify-between">
                        <div>
                            {results.length > 1 &&
                                <div>
                                    <Button icon="chevronLeft" onClick={decCurrentResult} aria-label="left"></Button>
                                    {currentResult + 1}/{results.length}
                                    <Button icon="chevronRight" onClick={incCurrentResult} aria-label="right"></Button>
                                </div>}
                        </div>
                        <React.Fragment>
                            <Button onClick={() => setIsAcceptDialogOpen(true)}>Accept</Button>
                            {isAcceptDialogOpen &&
                                <Dialog onClose={() => { }} width="320px">
                                    <div>
                                        some scary text
                                    </div>
                                    <Button onClick={() => setIsAcceptDialogOpen(false)}>Cancel</Button>
                                    <Button onClick={() => { setIsAcceptDialogOpen(false); acceptFn(results[currentResult]) }}>Accept</Button>
                                </Dialog>}
                        </React.Fragment>
                    </div>
                </React.Fragment>
            }
        </div >
    )
}

export function Scheduling() {
    const base = useBase()
    const globalConfig = useGlobalConfig()
    const facilitatorTable = base.getTableById(globalConfig.get("facilitatorTable"))
    const participantsTable = base.getTableById(globalConfig.get("participantsTable"))

    const requiredKeys = ["facilitatorTableView", "participantsTableView", "lengthOfMeeting"]
    const isConfigured = requiredKeys.every(key => globalConfig.get(key))

    let config = {
        cohortSizes: [5, 4],
        lengthOfMeeting: globalConfig.get("lengthOfMeeting"),
        increment: { hour: 0, minute: 30 }
    };

    let input;
    if (isConfigured) {
        // get an array of facilitators and participants
        const facilitatorView = facilitatorTable.getViewById(globalConfig.get("facilitatorTableView"))
        const participantView = participantsTable.getViewById(globalConfig.get("participantsTableView"))

        const facilitators = useRecords(facilitatorView, { fields: [globalConfig.get("facilitatorTableTimeAvField")] })
            .map(record => {
                return {
                    id: record.id,
                    name: record.name,
                    timeAv: parseTimeAvString2(record.getCellValue(globalConfig.get("facilitatorTableTimeAvField")), config)
                }
            })

        const participants = useRecords(participantView, { fields: [globalConfig.get("participantsTableTimeAvField")] })
            .map(record => {
                return {
                    id: record.id,
                    name: record.name,
                    timeAv: parseTimeAvString2(record.getCellValue(globalConfig.get("participantsTableTimeAvField")), config)
                }
            })

        input = {
            facilitators: facilitators,
            participants: participants
        }
    }

    const cohortsTable = base.getTableById(globalConfig.get("cohortsTable"))

    const accept = (solution) => {
        console.log(solution);
        const cohortRecords = solution.map(cohort => {
            const { facilitator, participants } = cohort
            return {
                fields: {
                    [globalConfig.get("cohortsTableFacilitatorField")]: [{ id: facilitator.id }],
                    [globalConfig.get("cohortsTableParticipantsField")]: participants.map(p => { return { id: p.id } }),
                    [globalConfig.get("cohortsTableMeetingTimesField")]: prettyPrintIntervals(findMeetings(cohort, config), config) || ""
                }
            }
        })
        cohortsTable.createRecordsAsync(cohortRecords)
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
                <Solver input={input} config={config} acceptFn={accept} />
                : <div>Please configure the algorithm above first.</div>}
        </div>
    )
}