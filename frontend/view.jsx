import React from "react";
import {
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
import { intersectIntervalArrays } from "../lib/algorithm";
import { parseTimeAvString2 } from "../lib/util";


function Widget({ cursor, config }) {
    const globalConfig = useGlobalConfig()
    const base = useBase()

    const recordId = cursor.selectedRecordIds[0]
    const table = base.getTableById(cursor.activeTableId)
    const record = useRecordById(table, recordId);

    const tableToTimeAvField = {
        [globalConfig.get(["participants", "table"])]: globalConfig.get(["participants", "timeAvField"]),
        [globalConfig.get(["facilitators", "table"])]: globalConfig.get(["facilitators", "timeAvField"]),
        [globalConfig.get(["cohorts", "table"])]: globalConfig.get(["cohorts", "meetingTimesField"])
    }

    const field = tableToTimeAvField[cursor.activeTableId]
    let timeav = record.getCellValue(field)

    const tableToType = {
        [globalConfig.get(["participants", "table"])]: "participant",
        [globalConfig.get(["cohorts", "table"])]: "cohort"
    }

    const type = tableToType[cursor.activeTableId]
    let cohorts;
    const cohortsTable = base.getTable(globalConfig.get(["cohorts", "table"]))
    const id = globalConfig.get(["cohorts", "meetingTimesField"])
    const allCohorts = useRecords(cohortsTable, { fields: [id] })
    if (type == "participant") {
        cohorts = allCohorts.filter(cohort => {
            const timeav2 = cohort.getCellValue(id)
            return intersectIntervalArrays(
                parseTimeAvString2(timeav, config),
                parseTimeAvString2(timeav2, config)).length > 0
        })
    }

    return (
        <div>
            <div className="text-xl">
                {record.name}
            </div>
            <div className="w-96">
                <TimeAvWidget timeav={timeav} config={config} />
            </div>
            {type == "participant" && <div>
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
            </div>}
        </div>
    )
}

export function View({ config }) {
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
        <Widget cursor={cursor} config={config} />
    </div>
}