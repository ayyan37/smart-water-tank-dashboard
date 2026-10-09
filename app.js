import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
    getDatabase,
    ref,
    onValue,
    set
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";


// ================= FIREBASE CONFIG =================

const firebaseConfig = {
    apiKey: "PASTE_YOUR_EXISTING_API_KEY",
    authDomain: "smart-water-tank-monitor-cc34b.firebaseapp.com",
    databaseURL: "https://smart-water-tank-monitor-cc34b-default-rtdb.firebaseio.com",
    projectId: "smart-water-tank-monitor-cc34b",
    storageBucket: "smart-water-tank-monitor-cc34b.firebasestorage.app",
    messagingSenderId: "464734764812",
    appId: "PASTE_YOUR_EXISTING_APP_ID"
};


// ================= INITIALIZE =================

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const sensorsRef = ref(database, "sensors");
const commandRef = ref(database, "pump/command");
const pumpStatusRef = ref(database, "pump/status");
const systemModeRef = ref(database, "system/mode");
const systemFaultRef = ref(database, "system/fault");


// ================= ELEMENTS =================

const pumpElement = document.getElementById("pumpStatus");
const pumpDecision = document.getElementById("pumpDecision");

const commandMessage = document.getElementById("commandMessage");

const pumpOnBtn = document.getElementById("pumpOnBtn");
const pumpOffBtn = document.getElementById("pumpOffBtn");
const autoBtn = document.getElementById("autoBtn");


// ================= HELPER =================

function setStatus(element, text, className) {
    element.textContent = text;
    element.className = "decision " + className;
}


// ================= COMMAND STATUS =================

let currentCommand = "AUTO";
let commandLoaded = false;
let commandBusy = false;

function updateCommandMessage(message, color = "#374151") {
    commandMessage.textContent = message;
    commandMessage.style.color = color;
}

function updateButtonState() {
    pumpOnBtn.disabled = commandBusy;
    pumpOffBtn.disabled = commandBusy;
    autoBtn.disabled = commandBusy;

    pumpOnBtn.classList.toggle(
        "selected",
        currentCommand === "ON"
    );

    pumpOffBtn.classList.toggle(
        "selected",
        currentCommand === "OFF"
    );

    autoBtn.classList.toggle(
        "selected",
        currentCommand === "AUTO"
    );
}


// ================= SEND PUMP COMMAND =================

async function sendPumpCommand(command) {
    if (commandBusy) return;

    const confirmed = window.confirm(
        command === "ON"
            ? "Request pump ON? The ESP32 safety checks can still block it."
            : command === "OFF"
                ? "Request pump OFF?"
                : "Switch pump control back to AUTO mode?"
    );

    if (!confirmed) return;

    commandBusy = true;
    updateButtonState();

    updateCommandMessage(
        "Sending " + command + " command...",
        "#1d4ed8"
    );

    try {
        await set(commandRef, command);

        currentCommand = command;

        updateCommandMessage(
            "Command sent: " + command +
            ". Waiting for ESP32 status...",
            "#1d4ed8"
        );

        updateButtonState();

    } catch (error) {
        console.error("Pump command failed:", error);

        updateCommandMessage(
            "Command failed: " + error.message,
            "#dc2626"
        );

    } finally {
        commandBusy = false;
        updateButtonState();
    }
}


// ================= BUTTON EVENTS =================

pumpOnBtn.addEventListener("click", () => {
    sendPumpCommand("ON");
});

pumpOffBtn.addEventListener("click", () => {
    sendPumpCommand("OFF");
});

autoBtn.addEventListener("click", () => {
    sendPumpCommand("AUTO");
});


// ================= CURRENT COMMAND =================

onValue(
    commandRef,
    (snapshot) => {
        const value = snapshot.val();

        if (
            value === "AUTO" ||
            value === "ON" ||
            value === "OFF"
        ) {
            currentCommand = value;
            commandLoaded = true;

            updateButtonState();

            updateCommandMessage(
                "Control mode: " + value,
                "#15803d"
            );
        } else {
            updateCommandMessage(
                "No valid pump command found in Firebase.",
                "#b45309"
            );
        }
    },
    (error) => {
        console.error("Command listener error:", error);

        updateCommandMessage(
            "Cannot read pump command: " + error.message,
            "#dc2626"
        );
    }
);


// ================= HELPER FOR OPTIONAL VALUES =================

function showValue(id, value, suffix = "") {
    const element = document.getElementById(id);

    if (value === null || value === undefined || value === "") {
        element.textContent = "--";
    } else {
        element.textContent = value + suffix;
    }
}


// ================= FIREBASE SENSOR DATA =================

onValue(
    sensorsRef,
    (snapshot) => {
        const data = snapshot.val();

        if (!data) {
            console.log("No sensor data found.");
            return;
        }

        console.log("Firebase Data:", data);


        // TURBIDITY

        const turbidity = Number(data.turbidity);

        showValue(
            "turbidity",
            Number.isFinite(turbidity) ? turbidity : "--"
        );

        const turbidityStatus =
            document.getElementById("turbidityStatus");

        if (Number.isFinite(turbidity)) {
            if (turbidity >= 3000) {
                setStatus(turbidityStatus, "CLEAR", "clear");
            } else {
                setStatus(turbidityStatus, "DIRTY", "dirty");
            }
        } else {
            setStatus(turbidityStatus, "WAITING", "normal");
        }


        // TDS ADC

        showValue("tdsAdc", data.tdsAdc);


        // TDS VOLTAGE

        showValue(
            "tdsVoltage",
            data.tdsVoltage,
            " V"
        );


        // TDS ESTIMATE

        const tds = Number(data.tdsEstimate);

        showValue(
            "tdsEstimate",
            Number.isFinite(tds) ? tds : "--",
            Number.isFinite(tds) ? " ppm" : ""
        );

        const tdsStatus =
            document.getElementById("tdsStatus");

        if (Number.isFinite(tds)) {
            if (tds <= 500) {
                setStatus(tdsStatus, "SAFE", "safe");
            } else {
                setStatus(tdsStatus, "UNSAFE", "unsafe");
            }
        } else {
            setStatus(tdsStatus, "WAITING", "normal");
        }


        // TDS REFERENCE

        showValue("tdsReference", data.tdsReference);


        // ULTRASONIC

        showValue("ultrasonic", data.ultrasonic);


        // WATER LEVEL

        const waterLevelElement =
            document.getElementById("waterLevel");

        const waterFill =
            document.getElementById("waterFill");

        const waterLevelStatus =
            document.getElementById("waterLevelStatus");

        const invalidLevel =
            data.ultrasonic === "ERROR" ||
            data.waterLevel === "INVALID";

        const waterLevel = Number(data.waterLevel);

        if (invalidLevel) {
            waterLevelElement.textContent = "INVALID";
            waterFill.style.height = "0%";

            setStatus(
                waterLevelStatus,
                "INVALID",
                "unsafe"
            );

        } else if (
            data.waterLevel !== null &&
            data.waterLevel !== undefined &&
            data.waterLevel !== "" &&
            Number.isFinite(waterLevel)
        ) {
            waterLevelElement.textContent =
                waterLevel.toFixed(1) + "%";

            waterFill.style.height =
                Math.max(0, Math.min(100, waterLevel)) + "%";

            if (waterLevel <= 20) {
                setStatus(waterLevelStatus, "LOW", "low");
            } else if (waterLevel >= 90) {
                setStatus(waterLevelStatus, "FULL", "full");
            } else {
                setStatus(waterLevelStatus, "NORMAL", "normal");
            }

        } else {
            waterLevelElement.textContent = "--";
            waterFill.style.height = "0%";

            setStatus(
                waterLevelStatus,
                "WAITING",
                "normal"
            );
        }


        // FLOW RATE

        showValue(
            "flowRate",
            data.flowRate ?? 0,
            " L/min"
        );


        // TOTAL FLOW

        showValue(
            "totalFlow",
            data.totalFlow ?? 0,
            " L"
        );

    },
    (error) => {
        console.error("Sensor listener error:", error);

        updateCommandMessage(
            "Firebase sensor read error: " + error.message,
            "#dc2626"
        );
    }
);


// ================= ACTUAL PUMP STATUS =================

onValue(
    pumpStatusRef,
    (snapshot) => {
        const value = String(snapshot.val() ?? "--").toUpperCase();

        pumpElement.textContent = value;

        if (value === "ON") {
            pumpElement.style.color = "#16a05d";
            setStatus(pumpDecision, "PUMP ON", "on");
        } else if (value === "OFF") {
            pumpElement.style.color = "#dc3545";
            setStatus(pumpDecision, "PUMP OFF", "off");
        } else {
            pumpElement.style.color = "#6b7280";
            setStatus(pumpDecision, "WAITING", "normal");
        }
    },
    (error) => {
        console.error("Pump status listener error:", error);
    }
);


// ================= SYSTEM MODE =================

onValue(
    systemModeRef,
    (snapshot) => {
        const mode = snapshot.val();

        if (mode) {
            console.log("ESP32 system mode:", mode);
        }
    }
);


// ================= SYSTEM FAULT =================

onValue(
    systemFaultRef,
    (snapshot) => {
        const fault = snapshot.val();

        if (fault && fault !== "NONE") {
            console.warn("ESP32 system fault:", fault);

            updateCommandMessage(
                "ESP32 safety fault: " + fault,
                "#dc2626"
            );
        }
    }
);
