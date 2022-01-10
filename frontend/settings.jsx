import React, { useState } from 'react';
import {
    TablePickerSynced,
    FieldPickerSynced,
    FormField,
    useGlobalConfig,
    useBase,
} from "@airtable/blocks/ui";

export function Settings() {
    const globalConfig = useGlobalConfig()
    const base = useBase()

    return (
        <div>
            <h2 className="font-medium text-lg">Base, table, and field settings</h2>
            <div className="space-y divide-y divide-slate-400 divide-solid">
                <div>
                    <FormField label="Facilitators table">
                        <TablePickerSynced
                            globalConfigKey="facilitatorTable"
                            width="320px"
                        />
                    </FormField>
                    {globalConfig.get("facilitatorTable") &&
                        <FormField label="Facilitators table time availability field">
                            <FieldPickerSynced
                                table={base.getTableById(globalConfig.get("facilitatorTable"))}
                                globalConfigKey="facilitatorTableTimeAvField"
                                width="320px"
                            />
                        </FormField>
                    }
                </div>
                <div>
                    <FormField label="Participants table">
                        <TablePickerSynced
                            globalConfigKey="participantsTable"
                            width="320px"
                        />
                    </FormField>
                    {globalConfig.get("participantsTable") &&
                        <FormField label="Participants table time availability field">
                            <FieldPickerSynced
                                table={base.getTableById(globalConfig.get("participantsTable"))}
                                globalConfigKey="participantsTableTimeAvField"
                                width="320px"
                            />
                        </FormField>
                    }
                </div>
                <div>
                    <FormField label="Cohorts table">
                        <TablePickerSynced
                            globalConfigKey="cohortsTable"
                            width="320px"
                        />
                    </FormField>
                    {globalConfig.get("cohortsTable") &&
                        <div>
                            <FormField label="Cohorts table facilitator field">
                                <FieldPickerSynced
                                    table={base.getTableById(globalConfig.get("cohortsTable"))}
                                    globalConfigKey="cohortsTableFacilitatorField"
                                    width="320px"
                                />
                            </FormField>
                            <FormField label="Cohorts table participants field">
                                <FieldPickerSynced
                                    table={base.getTableById(globalConfig.get("cohortsTable"))}
                                    globalConfigKey="cohortsTableParticipantsField"
                                    width="320px"
                                />
                            </FormField>
                        </div>
                    }
                </div>
            </div>
        </div>
    )
}