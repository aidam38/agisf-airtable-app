import React, { useState } from 'react';
import {
    TablePickerSynced,
    FieldPickerSynced,
    InputSynced,
    FormField,
    useGlobalConfig,
    useBase,
    Select
} from "@airtable/blocks/ui";
import { getNextNMondays } from "../lib/util";

export function Settings() {
    const globalConfig = useGlobalConfig()
    const base = useBase()

    const startDateOptions = getNextNMondays(10).map(d => {
        return {
            label: d.toLocaleDateString("en-US", { timeZone: 'UTC' }),
            value: d.getTime()
        }
    })

    return (
        <div>
            <h2 className="font-medium text-lg">Algorithm, base, table, and field settings</h2>
            <div className="space-y divide-y divide-slate-400 divide-solid">
                <div>
                    <FormField label="Length of meeting">
                        <InputSynced
                            type="number"
                            globalConfigKey={["config", "lengthOfMeeting"]}
                            width="320px" />
                    </FormField>
                    <FormField label="Cohort sizes (comma-separated list in order of preference)">
                        <InputSynced
                            globalConfigKey={["config", "cohortSizes"]}
                            width="320px" />
                    </FormField>
                    <FormField label="First week">
                        <Select
                            options={startDateOptions}
                            value={globalConfig.get(["config", "startDate"])}
                            onChange={newValue => globalConfig.setAsync(["config", "startDate"], newValue)}
                            width="320px"
                        >
                        </Select>
                    </FormField>
                </div>
                <div>
                    <FormField label="Facilitators table">
                        <TablePickerSynced
                            globalConfigKey={["facilitators", "table"]}
                            width="320px"
                        />
                    </FormField>
                    {globalConfig.get(["facilitators", "table"]) &&
                        <FormField label="Facilitators table time availability field">
                            <FieldPickerSynced
                                table={base.getTableById(globalConfig.get(["facilitators", "table"]))}
                                globalConfigKey={["facilitators", "timeAvField"]}
                                width="320px"
                            />
                        </FormField>
                    }
                </div>
                <div>
                    <FormField label="Participants table">
                        <TablePickerSynced
                            globalConfigKey={["participants", "table"]}
                            width="320px"
                        />
                    </FormField>
                    {globalConfig.get(["participants", "table"]) &&
                        <FormField label="Participants table time availability field">
                            <FieldPickerSynced
                                table={base.getTableById(globalConfig.get(["participants", "table"]))}
                                globalConfigKey={["participants", "timeAvField"]}
                                width="320px"
                            />
                        </FormField>
                    }
                </div>
                <div>
                    <FormField label="Cohorts table">
                        <TablePickerSynced
                            globalConfigKey={["cohorts", "table"]}
                            width="320px"
                        />
                    </FormField>
                    {globalConfig.get(["cohorts", "table"]) &&
                        <div>
                            <FormField label="Cohorts table facilitator field">
                                <FieldPickerSynced
                                    table={base.getTableById(globalConfig.get(["cohorts", "table"]))}
                                    globalConfigKey={["cohorts", "facilitatorField"]}
                                    width="320px"
                                />
                            </FormField>
                            <FormField label="Cohorts table participants field">
                                <FieldPickerSynced
                                    table={base.getTableById(globalConfig.get(["cohorts", "table"]))}
                                    globalConfigKey={["cohorts", "participantsField"]}
                                    width="320px"
                                />
                            </FormField>
                            <FormField label="Cohorts table meeting times field">
                                <FieldPickerSynced
                                    table={base.getTableById(globalConfig.get(["cohorts", "table"]))}
                                    globalConfigKey={["cohorts", "meetingTimesField"]}
                                    width="320px"
                                />
                            </FormField>
                            <FormField label="Cohorts table main meeting time start date field">
                                <FieldPickerSynced
                                    table={base.getTableById(globalConfig.get(["cohorts", "table"]))}
                                    globalConfigKey={["cohorts", "startDateField"]}
                                    width="320px"
                                />
                            </FormField>
                            <FormField label="Cohorts table main meeting time end date field">
                                <FieldPickerSynced
                                    table={base.getTableById(globalConfig.get(["cohorts", "table"]))}
                                    globalConfigKey={["cohorts", "endDateField"]}
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