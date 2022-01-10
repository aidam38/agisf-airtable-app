import { Button } from "@airtable/blocks/ui";
import React from "react";
import init, {greet} from "./agisf_rust_algorithm.js";

export function Test() {

    init("https://agisf-rust-algorithm.vercel.app/agisf_rust_algorithm_bg.wasm")
      .then(() => {
        greet("WebAssembly")
      });
  

    function handleClick() {
        console.log("Airtable")
    }
    return (
        <div>
            <Button onClick={handleClick}>Greet!</Button>
        </div>
    )
}