"""
ElectroPulse OS - Unified Spacecraft Medical Telemetry Gateway
Aggregates heterogeneous on-board medical devices, wearables, environmental sensors,
and human-computer interaction inputs into a normalized telemetry bus.
"""

import time
import math
import random
from dataclasses import dataclass, asdict
from typing import Dict, Any, List, Optional

@dataclass
class PhysiologicalVitals:
    heart_rate_bpm: float
    hrv_rmssd_ms: float
    spo2_pct: float
    skin_temp_celsius: float
    systolic_bp_mmhg: float
    diastolic_bp_mmhg: float
    timestamp: float

@dataclass
class EnvironmentalTelemetry:
    cabin_co2_mmhg: float
    cabin_pressure_kpa: float
    cabin_temp_celsius: float
    radiation_dose_rate_usv_hr: float
    cumulative_mission_radiation_msv: float
    environment_mode: str  # "TRANSIT", "ISS_LEO", "LUNAR_BASE", "MARS_SURFACE"
    timestamp: float

@dataclass
class KeystrokeInteraction:
    mean_dwell_time_ms: float
    mean_flight_time_ms: float
    flight_time_variance: float
    backspace_ratio: float
    keystrokes_per_minute: float
    motor_jitter_index: float
    timestamp: float

@dataclass
class POCUSUltrasoundFrame:
    scan_target: str  # "OPTIC_NERVE_SHEATH", "INTERNAL_JUGULAR_VEIN", "CARDIAC"
    measured_onsd_mm: float
    sheath_acoustic_shadowing_pct: float
    image_quality_index: float
    timestamp: float

@dataclass
class CabinVisionTelemetry:
    perclos_score: float  # Percentage of Eye Closure (0.0 to 1.0)
    blink_frequency_per_min: float
    gaze_stability_index: float
    timestamp: float

@dataclass
class UnifiedSpacecraftTelemetryPacket:
    crew_id: str
    vitals: PhysiologicalVitals
    environment: EnvironmentalTelemetry
    interaction: KeystrokeInteraction
    ultrasound: POCUSUltrasoundFrame
    vision: CabinVisionTelemetry
    timestamp: float


class UnifiedMedicalGateway:
    """
    Space-grade data bus emulator connecting heterogeneous spacecraft medical payloads
    via virtual SpaceWire / CAN Bus / MIL-STD-1553 interfaces.
    """

    def __init__(self, crew_id: str = "CDR-VANCE-04", environment_mode: str = "MARS_TRANSIT"):
        self.crew_id = crew_id
        self.environment_mode = environment_mode
        self.cumulative_radiation_msv = 142.6  # Day 180 of Mars Transit
        self.step_counter = 0

    def generate_packet(self, scenario: str = "NOMINAL") -> UnifiedSpacecraftTelemetryPacket:
        """
        Generate a synchronous packet across all medical and environmental instruments.
        Supported scenarios:
          - "NOMINAL": Normal healthy baseline in microgravity.
          - "SANS_FLUID_SHIFT": Cephalad fluid shift causing optic disc swelling & ICP rise.
          - "CABIN_HYPERCAPNIA": ECLSS CO2 scrubber degradation causing headache & tachycardia.
          - "SOLAR_PARTICLE_EVENT": Sudden dangerous radiation spike outside spacecraft.
          - "COGNITIVE_EXHAUSTION": Circadian sleep deprivation with slowed keystrokes & eye closures.
        """
        self.step_counter += 1
        now = time.time()
        t = self.step_counter * 0.1

        # Base nominal values
        hr = 70.0 + 4.0 * math.sin(t * 0.5) + random.uniform(-1.5, 1.5)
        hrv = 55.0 + 5.0 * math.cos(t * 0.3) + random.uniform(-2.0, 2.0)
        spo2 = 98.0 + random.uniform(-0.5, 0.5)
        temp = 36.8 + 0.1 * math.sin(t * 0.1)
        sys_bp = 118.0 + random.uniform(-2, 2)
        dia_bp = 76.0 + random.uniform(-2, 2)

        co2 = 2.4 + 0.2 * math.sin(t * 0.2)  # Nominal ISS/spacecraft CO2 is 2-3 mmHg
        pressure = 101.3 + random.uniform(-0.1, 0.1)
        radiation_rate = 22.5 + random.uniform(-2.0, 2.0)  # ~22 uSv/hr in GCR deep space

        dwell_time = 85.0 + random.uniform(-5.0, 5.0)
        flight_time = 140.0 + random.uniform(-10.0, 10.0)
        flight_var = 18.0 + random.uniform(-3.0, 3.0)
        backspace_ratio = 0.04 + random.uniform(-0.01, 0.01)
        kpm = 240.0 + random.uniform(-15.0, 15.0)
        jitter = 0.08 + random.uniform(-0.02, 0.02)

        onsd = 4.6 + 0.1 * math.sin(t * 0.05)  # Normal < 5.0 mm
        perclos = 0.08 + random.uniform(-0.02, 0.02)
        blink_rate = 14.0 + random.uniform(-1.5, 1.5)

        # Apply specific scenario distortions
        if scenario == "SANS_FLUID_SHIFT":
            onsd = 6.15 + random.uniform(-0.08, 0.08)  # Pathological dilation > 5.8 mm
            sys_bp = 136.0 + random.uniform(-3, 3)     # Increased central venous pressure
            hrv = 38.0 + random.uniform(-3, 3)

        elif scenario == "CABIN_HYPERCAPNIA":
            co2 = 5.2 + random.uniform(-0.2, 0.3)      # Dangerous hypercapnia > 4.0 mmHg
            hr = 96.0 + random.uniform(-2.0, 4.0)       # Reflex tachycardia
            spo2 = 94.2 + random.uniform(-0.5, 0.5)
            dwell_time = 120.0 + random.uniform(-8, 8)
            flight_time = 220.0 + random.uniform(-15, 15)

        elif scenario == "SOLAR_PARTICLE_EVENT":
            radiation_rate = 420.0 + random.uniform(-20, 50)  # Extreme acute dose rate!
            hr = 104.0 + random.uniform(-3, 5)                # Autonomic fight-or-flight panic
            hrv = 24.0 + random.uniform(-2, 2)

        elif scenario == "COGNITIVE_EXHAUSTION":
            perclos = 0.42 + random.uniform(-0.05, 0.05)       # Drooping eyelids (> 0.35 is drowsy)
            blink_rate = 26.0 + random.uniform(-2, 3)
            dwell_time = 145.0 + random.uniform(-10, 15)       # Slow key presses
            flight_time = 310.0 + random.uniform(-25, 30)      # High inter-key hesitation
            backspace_ratio = 0.19 + random.uniform(-0.02, 0.03)  # Frequent typo corrections
            kpm = 110.0 + random.uniform(-10, 10)
            jitter = 0.28 + random.uniform(-0.04, 0.04)

        self.cumulative_radiation_msv += (radiation_rate / 1000.0) * (0.1 / 3600.0)

        vitals = PhysiologicalVitals(
            heart_rate_bpm=round(hr, 1),
            hrv_rmssd_ms=round(hrv, 1),
            spo2_pct=round(spo2, 1),
            skin_temp_celsius=round(temp, 2),
            systolic_bp_mmhg=round(sys_bp, 1),
            diastolic_bp_mmhg=round(dia_bp, 1),
            timestamp=now
        )

        environment = EnvironmentalTelemetry(
            cabin_co2_mmhg=round(co2, 2),
            cabin_pressure_kpa=round(pressure, 2),
            cabin_temp_celsius=21.5,
            radiation_dose_rate_usv_hr=round(radiation_rate, 2),
            cumulative_mission_radiation_msv=round(self.cumulative_radiation_msv, 3),
            environment_mode=self.environment_mode,
            timestamp=now
        )

        interaction = KeystrokeInteraction(
            mean_dwell_time_ms=round(dwell_time, 1),
            mean_flight_time_ms=round(flight_time, 1),
            flight_time_variance=round(flight_var, 2),
            backspace_ratio=round(backspace_ratio, 3),
            keystrokes_per_minute=round(kpm, 1),
            motor_jitter_index=round(jitter, 3),
            timestamp=now
        )

        ultrasound = POCUSUltrasoundFrame(
            scan_target="OPTIC_NERVE_SHEATH",
            measured_onsd_mm=round(onsd, 2),
            sheath_acoustic_shadowing_pct=88.5,
            image_quality_index=0.94,
            timestamp=now
        )

        vision = CabinVisionTelemetry(
            perclos_score=round(perclos, 3),
            blink_frequency_per_min=round(blink_rate, 1),
            gaze_stability_index=round(1.0 - jitter, 2),
            timestamp=now
        )

        return UnifiedSpacecraftTelemetryPacket(
            crew_id=self.crew_id,
            vitals=vitals,
            environment=environment,
            interaction=interaction,
            ultrasound=ultrasound,
            vision=vision,
            timestamp=now
        )
