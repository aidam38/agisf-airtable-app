import React, { Fragment } from 'react';
import {
    initializeBlock,
    loadScriptFromURLAsync,
    useBase,
    Icon,
    useGlobalConfig,
    useCursor,
    useLoadable,
    useWatchable,
    useRecordById
} from '@airtable/blocks/ui';
import { Tab } from '@headlessui/react'
import { Set, Map } from 'immutable';
import { Settings } from './settings'
import { Scheduling } from './scheduling';
import { View } from './view';
import { Test } from './test';


function ATab({ icon, label }) {
    return (
        <Tab as={Fragment}>
            {({ selected }) => (
                <button
                    className={"flex px-2 py-1 " +
                        (selected ? "text-slate-50" : "text-slate-400")}>
                    <Icon name={icon} size={16} />
                    <span className="ml-1 tracking-widest uppercase text-xs font-medium">{label}</span>
                </button>
            )}
        </Tab>
    )
}

function App() {
    loadScriptFromURLAsync("https://cdn.tailwindcss.com")

    const base = useBase();
    const globalConfig = useGlobalConfig()
    const requiredKeys = [
        "facilitatorTable", "facilitatorTableTimeAvField",
        "participantsTable", "participantsTableTimeAvField",
        "cohortsTable", "cohortsTableFacilitatorField", "cohortsTableParticipantsField"]
    const isConfigured = requiredKeys.every(key => globalConfig.get(key))

    return (
        <Tab.Group defaultIndex={1}>
            <Tab.List className="h-8 p-1 w-full flex justify-between items-center bg-slate-500">
                {isConfigured ?
                    <div className="flex">
                        <ATab icon="shapes" label="Algorithm" />
                        <ATab icon="show1" label="View" />
                        <ATab icon="caret" label="Test" />
                    </div>
                    : <div className="px-2 py-1 text-slate-400">Please configure all settings first</div>}
                <ATab icon="settings" />
            </Tab.List>
            <Tab.Panels className="p-4 bg-slate-50 h-screen">
                {isConfigured &&
                    <React.Fragment>
                        <Tab.Panel><Scheduling /></Tab.Panel>
                        <Tab.Panel><View /></Tab.Panel>
                        <Tab.Panel><Test /></Tab.Panel>
                    </React.Fragment>}
                <Tab.Panel><Settings /></Tab.Panel>
            </Tab.Panels>
        </Tab.Group>
    )
}

initializeBlock(() => <App />);
