import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
    getDatabase,
    ref,
    onValue
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";


// ================= FIREBASE CONFIG =================

const firebaseConfig = {
    apiKey: "AIzaSyAQa3OKRc7oK8r12wy-Zq28IfW_44ehEco",
    authDomain: "smart-water-tank-monitor-cc34b.firebaseapp.com",
    databaseURL: "https://smart-water-tank-monitor-cc34b-default-rtdb.firebaseio.com",
    projectId: "smart-water-tank-monitor-cc34b",
    storageBucket: "smart-water-tank-monitor-cc34b.firebasestorage.app",
    messagingSenderId: "464734764812",
    appId: "1:464734764812:web:41cf5a3ac73e8ebd0b5329"
};


// ================= INITIALIZE =================

const app = initializeApp(firebaseConfig);

const database = getDatabase(app);

const sensorsRef = ref(database, "sensors");


// ================= HELPER =================

function setStatus(element, text, className) {

    element.textContent = text;

    element.className =
        "decision " + className;
}


// ================= FIREBASE DATA =================

onValue(sensorsRef, (snapshot) => {

    const data = snapshot.val();

    if (!data) {

        console.log("No sensor data found.");

        return;
    }

    console.log("Firebase Data:", data);


    // =================================================
    // TURBIDITY
    // =================================================

    const turbidity =
        Number(data.turbidity);

    document.getElementById("turbidity").textContent =
        Number.isFinite(turbidity)
            ? turbidity
            : "--";


    const turbidityStatus =
        document.getElementById("turbidityStatus");


    if (Number.isFinite(turbidity)) {

        if (turbidity >= 3000) {

            setStatus(
                turbidityStatus,
                "CLEAR",
                "clear"
            );

        } else {

            setStatus(
                turbidityStatus,
                "DIRTY",
                "dirty"
            );
        }

    } else {

        setStatus(
            turbidityStatus,
            "WAITING",
            "normal"
        );
    }


    // =================================================
    // TDS ADC
    // =================================================

    document.getElementById("tdsAdc").textContent =
        data.tdsAdc ?? "--";


    // =================================================
    // TDS VOLTAGE
    // =================================================

    document.getElementById("tdsVoltage").textContent =
        data.tdsVoltage != null
            ? data.tdsVoltage + " V"
            : "--";


    // =================================================
    // TDS ESTIMATE
    // =================================================

    const tds =
        Number(data.tdsEstimate);

    document.getElementById("tdsEstimate").textContent =
        Number.isFinite(tds)
            ? tds + " ppm"
            : "--";


    const tdsStatus =
        document.getElementById("tdsStatus");


    if (Number.isFinite(tds)) {

        if (tds <= 500) {

            setStatus(
                tdsStatus,
                "SAFE",
                "safe"
            );

        } else {

            setStatus(
                tdsStatus,
                "UNSAFE",
                "unsafe"
            );
        }

    } else {

        setStatus(
            tdsStatus,
            "WAITING",
            "normal"
        );
    }


    // =================================================
    // TDS REFERENCE
    // =================================================

    document.getElementById("tdsReference").textContent =
        data.tdsReference ?? "--";


    // =================================================
    // ULTRASONIC
    // =================================================

    document.getElementById("ultrasonic").textContent =
        data.ultrasonic ?? "--";


    // =================================================
    // WATER LEVEL
    // =================================================

    const waterLevelElement =
        document.getElementById("waterLevel");

    const waterFill =
        document.getElementById("waterFill");

    const waterLevelStatus =
        document.getElementById("waterLevelStatus");


    let waterLevel =
        Number(data.waterLevel);


    if (
        data.ultrasonic === "ERROR" ||
        data.waterLevel === "INVALID"
    ) {

        waterLevelElement.textContent =
            "INVALID";

        waterFill.style.height =
            "0%";

        setStatus(
            waterLevelStatus,
            "INVALID",
            "unsafe"
        );

    }

    else if (Number.isFinite(waterLevel)) {

        waterLevelElement.textContent =
            waterLevel + "%";


        waterFill.style.height =
            Math.max(
                0,
                Math.min(100, waterLevel)
            ) + "%";


        if (waterLevel <= 20) {

            setStatus(
                waterLevelStatus,
                "LOW",
                "low"
            );

        }

        else if (waterLevel >= 90) {

            setStatus(
                waterLevelStatus,
                "FULL",
                "full"
            );

        }

        else {

            setStatus(
                waterLevelStatus,
                "NORMAL",
                "normal"
            );
        }

    }

    else {

        waterLevelElement.textContent =
            "--";

        waterFill.style.height =
            "0%";

        setStatus(
            waterLevelStatus,
            "WAITING",
            "normal"
        );
    }


    // =================================================
    // FLOW RATE
    // =================================================

    document.getElementById("flowRate").textContent =
        data.flowRate != null
            ? data.flowRate + " L/min"
            : "0.00 L/min";


    // =================================================
    // TOTAL FLOW
    // =================================================

    document.getElementById("totalFlow").textContent =
        data.totalFlow != null
            ? data.totalFlow + " L"
            : "0.000 L";


    // =================================================
    // PUMP STATUS
    // =================================================

    const pumpElement =
        document.getElementById("pumpStatus");

    const pumpDecision =
        document.getElementById("pumpDecision");


    const pumpStatus =
        String(data.pumpStatus ?? "--").toUpperCase();


    pumpElement.textContent =
        pumpStatus;


    if (pumpStatus === "ON") {

        pumpElement.style.color =
            "#16a05d";

        setStatus(
            pumpDecision,
            "PUMP ON",
            "on"
        );

    }

    else if (pumpStatus === "OFF") {

        pumpElement.style.color =
            "#dc3545";

        setStatus(
            pumpDecision,
            "PUMP OFF",
            "off"
        );

    }

    else {

        pumpElement.style.color =
            "#6b7280";

        setStatus(
            pumpDecision,
            "WAITING",
            "normal"
        );
    }

});