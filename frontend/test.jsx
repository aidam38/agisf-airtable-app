import { Button } from "@airtable/blocks/ui";
import React from "react";

export function Test() {

    function handleClick() {
        console.log("Airtable")
    }
    return (
        <div>
            <Button onClick={handleClick}>Greet!</Button>
        </div>
    )
}