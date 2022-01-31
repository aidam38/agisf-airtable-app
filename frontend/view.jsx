import React from "react";
import {
    Button,
    useGlobalConfig,
    useCursor,
    useBase,
    useTable,
    useRecords,
    useLoadable,
    useWatchable,
    useRecordById
} from "@airtable/blocks/ui";
import { TimeAvWidget } from "./components/widget";
import { intersectIntervalArrays, findMeetingsGroup, pickATime } from "../lib/algorithm";
import { getDates, parseTimeAvString2, prettyPrintIntervals } from "../lib/util";

function Facilitator({ record, config }) {
    const globalConfig = useGlobalConfig()

    const field = globalConfig.get(["facilitators", "timeAvField"])
    let timeav = record.getCellValue(field)

    return (
        <div>
            <div className="text-xl">
                {record.name}
            </div>
            <div className="w-96">
                <TimeAvWidget timeav={timeav} config={config} />
            </div>
        </div>
    )
}

function Participant({ record, config }) {
    const globalConfig = useGlobalConfig()
    const base = useBase()

    const field = globalConfig.get(["participants", "timeAvField"])
    let timeav = record.getCellValue(field)


    const cohortsTable = base.getTable(globalConfig.get(["cohorts", "table"]))
    const id = globalConfig.get(["cohorts", "meetingTimesField"])
    const allCohorts = useRecords(cohortsTable, { fields: [id] })
    const cohorts = allCohorts.filter(cohort => {
        const timeav2 = cohort.getCellValue(id)
        return intersectIntervalArrays(
            parseTimeAvString2(timeav, config),
            parseTimeAvString2(timeav2, config)).length > 0
    })

    return (
        <div>
            <div className="text-xl">
                {record.name}
            </div>
            <div className="w-96">
                <TimeAvWidget timeav={timeav} config={config} />
            </div>
            <div>
                {cohorts.map(cohort => {
                    return <div className="flex">
                        <div>
                            {cohort.name}
                        </div>
                        <button >
                            Move
                        </button>
                    </div>
                })}
            </div>
        </div>
    )
}

function Cohort({ record, config }) {
    const globalConfig = useGlobalConfig()
    const base = useBase()

    const cohortsTable = base.getTable(globalConfig.get(["cohorts", "table"]))

    // load cohort
    const allParticipants = useRecords(base.getTable(globalConfig.get(["participants", "table"])))
    const participants = record.getCellValue(globalConfig.get(["cohorts", "participantsField"])).map(p1 => {
        return allParticipants.find(p2 => p2.id == p1.id).getCellValue(globalConfig.get(["participants", "timeAvField"]))
    })

    const allFacilitators = useRecords(base.getTable(globalConfig.get(["facilitators", "table"])))
    const facilitator = record.getCellValue(globalConfig.get(["cohorts", "facilitatorField"])).map(p1 => {
        return allFacilitators.find(p2 => p2.id == p1.id).getCellValue(globalConfig.get(["facilitators", "timeAvField"]))
    })

    const allPeople = participants.concat(facilitator).map(s => parseTimeAvString2(s, config))

    const overlap = findMeetingsGroup(allPeople, config)
    const mainMeeting = pickATime(overlap, config)
    const monday = new Date(globalConfig.get(["config", "startDate"]))
    const [start, end] = getDates(mainMeeting, monday, config)

    const update = () => {
        cohortsTable.updateRecordAsync(record.id,
            {
                [globalConfig.get(["cohorts", "meetingTimesField"])]: prettyPrintIntervals(overlap, config) || "",
                [globalConfig.get(["cohorts", "startDateField"])]: start,
                [globalConfig.get(["cohorts", "endDateField"])]: end
            })
    }

    return (
        <div>
            <div className="text-xl">
                {record.name}
            </div>
            <div className="w-96">
                <TimeAvWidget timeav={prettyPrintIntervals(overlap, config)} config={config} />
            </div>
            <div className="flex justify-end">
                <Button onClick={update}>
                    Reaccept
                </Button>
            </div>
        </div>
    )
}

function View({ cursor, config }) {
    const globalConfig = useGlobalConfig()
    const base = useBase()

    const recordId = cursor.selectedRecordIds[0]
    const table = base.getTableById(cursor.activeTableId)
    const record = useRecordById(table, recordId);

    if (cursor.activeTableId == globalConfig.get(["facilitators", "table"])) {
        return <Facilitator record={record} config={config} />
    } else if (cursor.activeTableId == globalConfig.get(["participants", "table"])) {
        return <Participant record={record} config={config} />
    } else if (cursor.activeTableId == globalConfig.get(["cohorts", "table"])) {
        return <Cohort record={record} config={config} />
    } else {
        return <div>error</div>
    }
}

export function ViewWrapper({ config }) {
    const globalConfig = useGlobalConfig()
    const cursor = useCursor();

    useLoadable(cursor);
    useWatchable(cursor, ['selectedRecordIds']);

    if (![["participants", "table"], ["facilitators", "table"], ["cohorts", "table"]].map(key => globalConfig.get(key)).some(tid => tid == cursor.activeTableId)) {
        return <div>Not in participants, facilitators, or cohorts table</div>;
    }

    if (cursor.selectedRecordIds.length == 0) {
        return <div>No records selected</div>
    }

    return <div>
        <View cursor={cursor} config={config} />
    </div>
}