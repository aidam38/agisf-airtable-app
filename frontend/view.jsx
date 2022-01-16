import React from "react";
import {
    useGlobalConfig,
    useCursor,
    useBase,
    useRecords,
    useLoadable,
    useWatchable
} from "@airtable/blocks/ui";
import { TimeAvWidget } from "./widget";

export function View() {
    const globalConfig = useGlobalConfig()
    const base = useBase()
    const cursor = useCursor();

    useLoadable(cursor);
    useWatchable(cursor, ['selectedRecordIds']);

    if (!["participantsTable", "facilitatorTable"].map(key => globalConfig.get(key)).some(tid => tid == cursor.activeTableId)) {
        return <div>Not in participants or facilitators table</div>;
    }
    const table = base.getTableById(cursor.activeTableId);

    const config = { increment: { hours: 0, minutes: 30 }}

    return (
        <div>
            {cursor.selectedRecordIds.length > 0 ?
                <div className="w-96">
                    <TimeAvWidget table={table} recordId={cursor.selectedRecordIds[0]} config={config} />
                </div>
                : <div>No records selected</div>
            }
        </div>
    )
}