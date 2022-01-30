import React from "react";
import {
    useGlobalConfig,
    useCursor,
    useBase,
    useLoadable,
    useWatchable,
    useRecordById
} from "@airtable/blocks/ui";
import { TimeAvWidget } from "./components/widget";

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

    return <Widget cursor={cursor} config={config}/>
}