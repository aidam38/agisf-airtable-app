import { durationToHours, unparseNumber, isWithin, parseTimeAvString2, prettyPrintCoord } from '../lib/util';
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

function Cell({ isBlocked, borderStyles, borderClasses }) {
    return (
        <div className={"h-2 " + (isBlocked ? "bg-green-500" : "bg-red-50") + " " + borderClasses}
            style={borderStyles}></div>
    )
}

export function TimeAvWidget({ table, recordId, config }) {
    console.log(table, recordId);
    const record = useRecordById(table, recordId);
    let timeav = record.getCellValue("Time availability in UTC")

    const multiplier = 1 / durationToHours(config.increment)

    timeav = parseTimeAvString2(timeav, config)

    const allNumbers = [...Array(7 * 24 * multiplier).keys()]

    const cellHeight = 2
    const leftColumnWidth = 12
    const labelFreq = 2

    return (
        <div>
            <div className="text-lg">
                {record.name}
            </div>
            <div className="flex">
                <div className={"w-" + leftColumnWidth}></div>
                <div className="grid w-full text-sm grid-cols-7">
                    {[...Array(7).keys()].map(d => {
                        return <div key={d} className="h-8 mx-auto">{dayLabels[d]}</div>
                    })}
                </div>
            </div>
            <div className="flex text-xs">
                <div className={"w-" + leftColumnWidth}>
                    {[24 * multiplier].filter((value) => {
                        return value % labelFreq == 0;
                    }).map(time => {
                        return <div className={"flex justify-end px-1 h-" + labelFreq * cellHeight}>
                            {prettyPrintCoord(unparseNumber(time, multiplier))}
                        </div>
                    })}
                </div>
                <div className="w-full">
                    <div className="grid grid-flow-col border-t border-l border-solid border-gray-800" style={{ "grid-template-rows": "repeat(48, minmax(0, 1fr))" }}>
                        {allNumbers.map((number, i) =>
                            <Cell key={number}
                                isBlocked={timeav.some(interval => isWithin(interval, number))}
                                borderClasses="border-r border-b border-gray-800 border-r-solid"
                                borderStyles={Math.floor(i / 7) % labelFreq == 0 ?
                                    { borderBottomStyle: "dotted" } :
                                    { borderBottomStyle: "solid" }} />)}
                    </div>
                </div>
            </div>
        </div >
    )
}