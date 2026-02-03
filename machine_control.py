#!/usr/bin/env python3
"""
Machine Control Module for Laser Engraving
Handles detection, connection, and control of laser engraving machines via USB/Serial/Bluetooth.
"""

import os
import time
import threading
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum

try:
    import serial
    import serial.tools.list_ports
    SERIAL_AVAILABLE = True
except ImportError:
    SERIAL_AVAILABLE = False
    print("Warning: pyserial not installed. USB/Serial device detection disabled.")
    print("Install with: pip install pyserial")

# Bluetooth support
try:
    import bluetooth
    BLUETOOTH_AVAILABLE = True
except ImportError:
    BLUETOOTH_AVAILABLE = False
    print("Info: pybluez not installed. Bluetooth device detection disabled.")
    print("Install with: pip install pybluez (optional for Bluetooth engravers)")


class MachineStatus(Enum):
    """Machine status states."""
    DISCONNECTED = "disconnected"
    IDLE = "idle"
    RUNNING = "running"
    PAUSED = "paused"
    ERROR = "error"
    HOMING = "homing"
    ALARM = "alarm"


class MachineType(Enum):
    """Supported machine types."""
    GRBL = "GRBL"  # GRBL-based (most DIY lasers)
    MARLIN = "Marlin"  # Marlin firmware (3D printers with laser)
    RUIDA = "Ruida"  # Ruida controllers (commercial CO2 lasers)
    SMOOTHIE = "Smoothieware"  # Smoothieware
    UNKNOWN = "Unknown"


class ConnectionType(Enum):
    """Connection type enumeration."""
    USB_SERIAL = "USB/Serial"
    BLUETOOTH = "Bluetooth"
    NETWORK = "Network"
    UNKNOWN = "Unknown"


@dataclass
class MachineInfo:
    """Information about a detected machine."""
    port: str
    name: str
    description: str
    machine_type: MachineType
    status: MachineStatus
    connection_type: ConnectionType = ConnectionType.USB_SERIAL
    serial_number: Optional[str] = None
    firmware_version: Optional[str] = None
    work_area: Optional[Tuple[float, float]] = None  # (width, height) in mm
    connected: bool = False
    bluetooth_address: Optional[str] = None  # For Bluetooth devices
    signal_strength: Optional[int] = None  # For Bluetooth/WiFi devices
    
    def to_dict(self):
        """Convert to dictionary for JSON serialization."""
        data = asdict(self)
        data['machine_type'] = self.machine_type.value
        data['status'] = self.status.value
        data['connection_type'] = self.connection_type.value
        return data


class MachineController:
    """
    Controls connected laser engraving machines.
    Supports USB/Serial and Bluetooth connections.
    """
    
    # Known laser engraver VID/PID combinations (extend this list)
    KNOWN_DEVICES = [
        # GRBL-based devices
        {"vid": 0x1A86, "pid": 0x7523, "name": "CH340 Serial (Common GRBL)", "type": MachineType.GRBL},
        {"vid": 0x2341, "pid": 0x0043, "name": "Arduino Uno (GRBL)", "type": MachineType.GRBL},
        {"vid": 0x2341, "pid": 0x0001, "name": "Arduino Mega (GRBL)", "type": MachineType.GRBL},
        {"vid": 0x16C0, "pid": 0x0483, "name": "Teensy (Smoothie)", "type": MachineType.SMOOTHIE},
        # Add more as needed
    ]
    
    # Keywords to identify Bluetooth laser engravers
    BLUETOOTH_LASER_KEYWORDS = [
        "laser", "engraver", "engrav", "neje", "xtool", "laserpecker",
        "ortur", "atomstack", "sculpfun", "cnc", "grbl"
    ]
    
    def __init__(self):
        """Initialize the machine controller."""
        self.machines: Dict[str, MachineInfo] = {}
        self.active_connection: Optional[serial.Serial] = None
        self.active_bluetooth_socket = None
        self.active_port: Optional[str] = None
        self.monitoring_thread: Optional[threading.Thread] = None
        self.should_monitor = False
    
    def scan_devices(self) -> List[MachineInfo]:
        """
        Scan for connected laser engraving machines (USB/Serial and Bluetooth).
        
        Returns:
            List of detected machines
        """
        detected_machines = []
        
        # Scan USB/Serial devices
        if SERIAL_AVAILABLE:
            detected_machines.extend(self._scan_serial_devices())
        
        # Scan Bluetooth devices
        if BLUETOOTH_AVAILABLE:
            detected_machines.extend(self._scan_bluetooth_devices())
        
        return detected_machines
    
    def _scan_serial_devices(self) -> List[MachineInfo]:
        """
        Scan for USB/Serial connected machines.
        
        Returns:
            List of detected serial machines
        """
        detected_machines = []
        ports = serial.tools.list_ports.comports()
        
        for port in ports:
            machine_type = self._identify_machine_type(port)
            
            # Create machine info
            machine = MachineInfo(
                port=port.device,
                name=self._get_friendly_name(port, machine_type),
                description=port.description,
                machine_type=machine_type,
                connection_type=ConnectionType.USB_SERIAL,
                status=MachineStatus.DISCONNECTED,
                serial_number=port.serial_number
            )
            
            detected_machines.append(machine)
            self.machines[port.device] = machine
        
        return detected_machines
    
    def _scan_bluetooth_devices(self) -> List[MachineInfo]:
        """
        Scan for Bluetooth laser engraving machines.
        
        Returns:
            List of detected Bluetooth machines
        """
        detected_machines = []
        
        try:
            print("Scanning for Bluetooth devices... (this may take 10-15 seconds)")
            # Discover nearby Bluetooth devices
            nearby_devices = bluetooth.discover_devices(
                duration=8,
                lookup_names=True,
                lookup_class=True
            )
            
            for addr, name, device_class in nearby_devices:
                # Check if this looks like a laser engraver
                if self._is_laser_engraver(name):
                    machine_type = self._identify_bluetooth_machine_type(name)
                    
                    # Create machine info for Bluetooth device
                    machine = MachineInfo(
                        port=f"BT:{addr}",  # Unique identifier for Bluetooth
                        name=name,
                        description=f"Bluetooth Laser Engraver ({addr})",
                        machine_type=machine_type,
                        connection_type=ConnectionType.BLUETOOTH,
                        status=MachineStatus.DISCONNECTED,
                        bluetooth_address=addr,
                        serial_number=addr  # Use BT address as serial
                    )
                    
                    detected_machines.append(machine)
                    self.machines[f"BT:{addr}"] = machine
                    print(f"  Found Bluetooth device: {name} ({addr})")
        
        except Exception as e:
            print(f"Bluetooth scan error: {e}")
            print("Note: Bluetooth may require admin/root privileges")
        
        return detected_machines
    
    def _is_laser_engraver(self, device_name: str) -> bool:
        """
        Check if a Bluetooth device name suggests it's a laser engraver.
        
        Args:
            device_name: The Bluetooth device name
            
        Returns:
            True if it looks like a laser engraver
        """
        if not device_name:
            return False
        
        name_lower = device_name.lower()
        for keyword in self.BLUETOOTH_LASER_KEYWORDS:
            if keyword in name_lower:
                return True
        return False
    
    def _identify_bluetooth_machine_type(self, device_name: str) -> MachineType:
        """
        Identify machine type from Bluetooth device name.
        
        Args:
            device_name: The Bluetooth device name
            
        Returns:
            MachineType enum
        """
        if not device_name:
            return MachineType.UNKNOWN
        
        name_lower = device_name.lower()
        
        # Check for specific brands/types
        if "neje" in name_lower or "xtool" in name_lower or "laserpecker" in name_lower:
            return MachineType.GRBL  # Most desktop engravers use GRBL
        elif "marlin" in name_lower:
            return MachineType.MARLIN
        elif "grbl" in name_lower or "cnc" in name_lower:
            return MachineType.GRBL
        
        return MachineType.UNKNOWN
    
    def _identify_machine_type(self, port) -> MachineType:
        """
        Identify the type of machine based on VID/PID or port description.
        
        Args:
            port: Serial port object
            
        Returns:
            MachineType enum
        """
        # Check against known devices
        if port.vid and port.pid:
            for device in self.KNOWN_DEVICES:
                if port.vid == device["vid"] and port.pid == device["pid"]:
                    return device["type"]
        
        # Check description for keywords
        desc_lower = port.description.lower()
        if "grbl" in desc_lower or "cnc" in desc_lower or "laser" in desc_lower:
            return MachineType.GRBL
        elif "marlin" in desc_lower:
            return MachineType.MARLIN
        elif "smoothie" in desc_lower:
            return MachineType.SMOOTHIE
        elif "ch340" in desc_lower or "ch341" in desc_lower:
            # CH340/CH341 chips are commonly used with GRBL
            return MachineType.GRBL
        
        return MachineType.UNKNOWN
    
    def _get_friendly_name(self, port, machine_type: MachineType) -> str:
        """Generate a friendly name for the machine."""
        if machine_type != MachineType.UNKNOWN:
            return f"{machine_type.value} Laser Engraver"
        return port.description or "Laser Engraver"
    
    def connect(self, port: str, baudrate: int = 115200) -> bool:
        """
        Connect to a specific machine (USB/Serial or Bluetooth).
        
        Args:
            port: Device port (e.g., 'COM3', '/dev/ttyUSB0', or 'BT:XX:XX:XX:XX:XX:XX')
            baudrate: Communication speed for serial (default: 115200)
            
        Returns:
            True if connection successful
        """
        try:
            # Close existing connection
            self.disconnect()
            
            # Check if this is a Bluetooth connection
            if port.startswith("BT:"):
                return self._connect_bluetooth(port)
            else:
                return self._connect_serial(port, baudrate)
                
        except Exception as e:
            print(f"Error connecting to {port}: {e}")
            return False
    
    def _connect_serial(self, port: str, baudrate: int) -> bool:
        """
        Connect to a USB/Serial machine.
        
        Args:
            port: Serial port path
            baudrate: Communication speed
            
        Returns:
            True if connection successful
        """
        if not SERIAL_AVAILABLE:
            print("Error: pyserial not installed")
            return False
        
        # Open serial connection
        self.active_connection = serial.Serial(
            port=port,
            baudrate=baudrate,
            timeout=2,
            write_timeout=2
        )
        
        self.active_port = port
        time.sleep(2)  # Wait for connection to stabilize
        
        # Update machine status
        if port in self.machines:
            self.machines[port].connected = True
            self.machines[port].status = MachineStatus.IDLE
        
        # Start monitoring thread
        self._start_monitoring()
        
        print(f"Connected to {port} at {baudrate} baud")
        return True
    
    def _connect_bluetooth(self, port: str) -> bool:
        """
        Connect to a Bluetooth machine.
        
        Args:
            port: Bluetooth identifier (format: "BT:XX:XX:XX:XX:XX:XX")
            
        Returns:
            True if connection successful
        """
        if not BLUETOOTH_AVAILABLE:
            print("Error: pybluez not installed")
            return False
        
        # Extract Bluetooth address from port identifier
        bt_address = port.replace("BT:", "")
        
        try:
            # Create Bluetooth socket using RFCOMM (Serial Port Profile)
            print(f"Connecting to Bluetooth device {bt_address}...")
            sock = bluetooth.BluetoothSocket(bluetooth.RFCOMM)
            
            # Find the SPP service (Serial Port Profile)
            # Most laser engravers use channel 1, but we'll try to discover
            services = bluetooth.find_service(address=bt_address)
            
            channel = 1  # Default channel
            if services:
                for service in services:
                    if "serial" in service.get("name", "").lower():
                        channel = service["port"]
                        break
            
            # Connect to the device
            sock.connect((bt_address, channel))
            sock.settimeout(2.0)
            
            self.active_bluetooth_socket = sock
            self.active_port = port
            
            # Update machine status
            if port in self.machines:
                self.machines[port].connected = True
                self.machines[port].status = MachineStatus.IDLE
            
            # Start monitoring thread
            self._start_monitoring()
            
            print(f"Connected to Bluetooth device {bt_address}")
            return True
            
        except Exception as e:
            print(f"Bluetooth connection error: {e}")
            if self.active_bluetooth_socket:
                try:
                    self.active_bluetooth_socket.close()
                except Exception:
                    pass
                self.active_bluetooth_socket = None
            return False
    
    def disconnect(self):
        """Disconnect from the active machine."""
        self._stop_monitoring()
        
        # Close serial connection
        if self.active_connection and self.active_connection.is_open:
            try:
                self.active_connection.close()
            except Exception:
                pass
        
        # Close Bluetooth connection
        if self.active_bluetooth_socket:
            try:
                self.active_bluetooth_socket.close()
            except Exception:
                pass
        
        if self.active_port and self.active_port in self.machines:
            self.machines[self.active_port].connected = False
            self.machines[self.active_port].status = MachineStatus.DISCONNECTED
        
        self.active_connection = None
        self.active_bluetooth_socket = None
        self.active_port = None
    
    def send_command(self, command: str) -> Optional[str]:
        """
        Send a command to the connected machine (Serial or Bluetooth).
        
        Args:
            command: G-code or machine command
            
        Returns:
            Response from machine, or None if error
        """
        # Check if we have any active connection
        if not self.active_connection and not self.active_bluetooth_socket:
            return None
        
        try:
            # Ensure command ends with newline
            if not command.endswith('\n'):
                command += '\n'
            
            # Send via appropriate connection type
            if self.active_connection and self.active_connection.is_open:
                # Serial connection
                self.active_connection.write(command.encode())
                response = self.active_connection.readline().decode().strip()
                return response
                
            elif self.active_bluetooth_socket:
                # Bluetooth connection
                self.active_bluetooth_socket.send(command.encode())
                
                # Try to read response (with timeout)
                try:
                    response = self.active_bluetooth_socket.recv(1024).decode().strip()
                    return response
                except Exception:
                    # Bluetooth might not always respond
                    return "ok"
            
            return None
            
        except Exception as e:
            print(f"Error sending command: {e}")
            return None
    
    def send_gcode_file(self, filepath: str, progress_callback=None) -> bool:
        """
        Send a G-code file to the machine line by line.
        
        Args:
            filepath: Path to G-code file
            progress_callback: Optional function to call with progress (0-100)
            
        Returns:
            True if successful
        """
        if not self.active_connection and not self.active_bluetooth_socket:
            return False
        
        try:
            with open(filepath, 'r') as f:
                lines = f.readlines()
            
            total_lines = len(lines)
            
            for i, line in enumerate(lines):
                line = line.strip()
                
                # Skip empty lines and comments
                if not line or line.startswith(';') or line.startswith('('):
                    continue
                
                # Send line
                response = self.send_command(line)
                
                # Check for error
                if response and 'error' in response.lower():
                    print(f"Error on line {i}: {response}")
                    return False
                
                # Update progress
                if progress_callback:
                    progress = int((i + 1) / total_lines * 100)
                    progress_callback(progress)
            
            return True
            
        except Exception as e:
            print(f"Error sending G-code file: {e}")
            return False
    
    def get_status(self) -> Optional[MachineStatus]:
        """
        Get current machine status.
        
        Returns:
            MachineStatus or None if not connected
        """
        if not self.active_port or self.active_port not in self.machines:
            return None
        
        return self.machines[self.active_port].status
    
    def home(self) -> bool:
        """Send homing command to machine."""
        if self.active_port:
            self.machines[self.active_port].status = MachineStatus.HOMING
        
        response = self.send_command("$H")  # GRBL homing command
        return response is not None
    
    def pause(self) -> bool:
        """Pause the current job."""
        if self.active_port:
            self.machines[self.active_port].status = MachineStatus.PAUSED
        
        response = self.send_command("!")  # GRBL pause (feed hold)
        return response is not None
    
    def resume(self) -> bool:
        """Resume paused job."""
        if self.active_port:
            self.machines[self.active_port].status = MachineStatus.RUNNING
        
        response = self.send_command("~")  # GRBL resume (cycle start)
        return response is not None
    
    def stop(self) -> bool:
        """Stop the current job (soft reset)."""
        if self.active_port:
            self.machines[self.active_port].status = MachineStatus.IDLE
        
        response = self.send_command("\x18")  # GRBL soft reset (Ctrl-X)
        return response is not None
    
    def emergency_stop(self) -> bool:
        """Emergency stop (resets machine)."""
        if self.active_port:
            self.machines[self.active_port].status = MachineStatus.ALARM
        
        response = self.send_command("\x18")  # GRBL reset
        return response is not None
    
    def _start_monitoring(self):
        """Start background thread to monitor machine status."""
        if self.monitoring_thread and self.monitoring_thread.is_alive():
            return
        
        self.should_monitor = True
        self.monitoring_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.monitoring_thread.start()
    
    def _stop_monitoring(self):
        """Stop monitoring thread."""
        self.should_monitor = False
        if self.monitoring_thread:
            self.monitoring_thread.join(timeout=2)
    
    def _monitor_loop(self):
        """Background loop to monitor machine status."""
        while self.should_monitor and self.active_connection:
            try:
                # Send status query (GRBL style)
                if self.active_connection.is_open:
                    self.active_connection.write(b'?')
                    
                    # Read response
                    response = self.active_connection.readline().decode().strip()
                    
                    if response and self.active_port in self.machines:
                        # Parse status from response
                        # Example GRBL response: <Idle|MPos:0.000,0.000,0.000|FS:0,0>
                        if 'Idle' in response:
                            self.machines[self.active_port].status = MachineStatus.IDLE
                        elif 'Run' in response:
                            self.machines[self.active_port].status = MachineStatus.RUNNING
                        elif 'Alarm' in response:
                            self.machines[self.active_port].status = MachineStatus.ALARM
                
                time.sleep(1)  # Query every second
                
            except Exception:
                time.sleep(1)  # Wait before retry


# Global controller instance
_controller = None


def get_controller() -> MachineController:
    """Get or create the global machine controller instance."""
    global _controller
    if _controller is None:
        _controller = MachineController()
    return _controller


def scan_for_machines() -> List[Dict]:
    """
    Convenience function to scan for machines and return as dictionaries.
    
    Returns:
        List of machine information dictionaries
    """
    controller = get_controller()
    machines = controller.scan_devices()
    return [m.to_dict() for m in machines]
