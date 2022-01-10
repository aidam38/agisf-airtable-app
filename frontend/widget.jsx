import { parseTimeAvString, genererateAllCoords, generateAllTimes, stringifyTime } from '../lib/util';
import React from 'react';
import {
    useBase,
    useRecordById
} from "@airtable/blocks/ui";

const dayLabels = {
    0: "Mon",
    1: "Tue",
    2: "Wed",
    3: "Thu",
    4: "Fri",
    5: "Sat",
    6: "Sun"
}

function Cell({ coord, isBlocked, borderStyles, borderClasses }) {
    return (
        <div className={"h-2 " + (isBlocked ? "bg-green-500" : "bg-red-50") + " " + borderClasses}
            style={borderStyles}></div>
    )
}

export function TimeAvWidget({ table, recordId, config }) {
    console.log(table, recordId);
    const record = useRecordById(table, recordId);
    let timeav = record.getCellValue("Time availability in UTC")
    const increment = config.get("increment")

    timeav = parseTimeAvString(timeav, increment)

    const allCoords = genererateAllCoords(increment)

    const cellHeight = 2
    const leftColumnWidth = 12
    const labelFreq = 2
    console.log(generateAllTimes(config.get("increment")).filter((value, index, arr) => {
        return index % labelFreq == 0;
    }).toJS());

    return (
        <div>
            <div className="text-lg">
                {record.name}
            </div>
            <div className="flex">
                <div className={"w-" + leftColumnWidth}></div>
                <div className="grid w-full text-sm grid-cols-7">
                    {[0, 1, 2, 3, 4, 5, 6].map(d => {
                        return <div key={d} className="h-8 mx-auto">{dayLabels[d]}</div>
                    })}
                </div>
            </div>
            <div className="flex text-xs">
                <div className={"w-" + leftColumnWidth}>
                    {generateAllTimes(config.get("increment")).filter((value, index, arr) => {
                        return index % labelFreq == 0;
                    }).map(time => {
                        return <div className={"flex justify-end px-1 h-" + labelFreq * cellHeight}>
                            {stringifyTime(time)}
                        </div>
                    })}
                </div>
                <div className="w-full">
                    <div className="grid grid-cols-7 border-t border-l border-solid border-gray-800">
                        {allCoords.map((coord, i) =>
                            <Cell key={JSON.stringify(coord)}
                                coord={coord}
                                isBlocked={timeav.some(c => c.equals(coord))}
                                borderClasses="border-r border-b border-gray-800 border-r-solid"
                                borderStyles={Math.floor(i / 7) % labelFreq == 0 ?
                                    { borderBottomStyle: "dotted" } :
                                    { borderBottomStyle: "solid" }} />)}
                    </div>
                </div>
            </div>
        </div>
    )
}

function OldApp() {
    loadScriptFromURLAsync("https://cdn.tailwindcss.com")

    const base = useBase();
    const cursor = useCursor();
    const table = base.getTableById(cursor.activeTableId);

    useLoadable(cursor);
    useWatchable(cursor, ['selectedRecordIds']);

    if (cursor.selectedRecordIds.length == 1) {
        return <TimeAvWidget table={table} recordId={cursor.selectedRecordIds[0]} />
    } else {
        return <div>Can only select one record at a time</div>
    }
}