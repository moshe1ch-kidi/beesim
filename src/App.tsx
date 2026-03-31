 import React, { useState, useRef, useEffect } from 'react';
import * as Blockly from 'blockly';
import './blockly/blocks'; // Register blocks
import './blockly/generators'; // Register generators
import { javascriptGenerator } from './blockly/generators';
import { Play, Square, Trash2, Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw, Save, FolderOpen } from 'lucide-react';
import { MicrobitBoard } from './components/MicrobitBoard';
import { ElectronicComponents, DraggableComponent } from './components/ElectronicComponents';

const WireCanvas = ({ wires, drawingWireFrom, mousePos, resizeTrigger }: { wires: any[], drawingWireFrom: string | null, mousePos: {x: number, y: number}, resizeTrigger: number }) => {
  const [paths, setPaths] = useState<{id: string, d: string, color: string, isDashed: boolean}[]>([]);

  useEffect(() => {
    let frameId: number;
    const updatePaths = () => {
      const boardEl = document.getElementById('microbit-board-container');
      if (!boardEl) {
        frameId = requestAnimationFrame(updatePaths);
        return;
      }
      const boardRect = boardEl.getBoundingClientRect();
      
      const newPaths: {id: string, d: string, color: string, isDashed: boolean}[] = [];
      
      const calcPath = (startId: string, endId: string, isDrawing: boolean) => {
        const startEl = document.getElementById(startId);
        const endEl = endId === 'mouse-tracker' ? document.getElementById('mouse-tracker') : document.getElementById(endId);
        const svgEl = document.getElementById('wire-canvas-svg');
        
        if (!startEl || !endEl || !svgEl) return null;
        
        const startRect = startEl.getBoundingClientRect();
        const endRect = endEl.getBoundingClientRect();
        const svgRect = svgEl.getBoundingClientRect();
        
        const isM = startId.includes('port-M');
        const isS = startId.includes('port-S');
        const isJ = startId.includes('port-J');
        const isI = startId.includes('port-I');
        
        // Extract port number for dynamic offset to prevent overlapping
        const portNumMatch = startId.match(/\d+/);
        const portNum = portNumMatch ? parseInt(portNumMatch[0]) : 0;
        const portOffset = (portNum - 1) * 12; // 12px separation between wires

        let startX = startRect.left + startRect.width / 2 - svgRect.left;
        let startY = startRect.top + startRect.height / 2 - svgRect.top;
        
        if (isJ) startX = startRect.right - svgRect.left;
        if (isI) startX = startRect.left - svgRect.left;
        if (isM) startY = startRect.bottom - svgRect.top;
        
        let endX = endRect.left + endRect.width / 2 - svgRect.left;
        let endY = endRect.top - svgRect.top;
        if (isDrawing) {
          endX = endRect.left - svgRect.left;
          endY = endRect.top - svgRect.top;
        }
        
        let d = `M ${startX} ${startY} `;
        
        const padding = 40;
        const boardBottom = boardRect.bottom + padding - svgRect.top;
        
        if (isJ) {
          const rightEdge = Math.max(boardRect.right + 60 - svgRect.left, startX + 60) + portOffset;
          d += `L ${rightEdge} ${startY} `;
          const midY = endY - 20 - (portOffset / 2);
          
          if (endX > rightEdge) {
             d += `L ${rightEdge} ${midY} `;
             d += `L ${endX} ${midY} `;
          } else {
             const safeY = Math.max(boardBottom + portOffset, midY);
             d += `L ${rightEdge} ${safeY} `;
             d += `L ${endX} ${safeY} `;
             if (safeY !== midY) {
                d += `L ${endX} ${midY} `;
             }
          }
          d += `L ${endX} ${endY}`;
        } else if (isI) {
          const leftEdge = Math.min(boardRect.left - padding - svgRect.left, startX - padding) - portOffset;
          d += `L ${leftEdge} ${startY} `;
          const midY = endY - 20 - (portOffset / 2);
          
          if (endX < leftEdge) {
             d += `L ${leftEdge} ${midY} `;
             d += `L ${endX} ${midY} `;
          } else {
             const safeY = Math.max(boardBottom + portOffset, midY);
             d += `L ${leftEdge} ${safeY} `;
             d += `L ${endX} ${safeY} `;
             if (safeY !== midY) {
                d += `L ${endX} ${midY} `;
             }
          }
          d += `L ${endX} ${endY}`;
        } else if (isS) {
          // 90-degree bypass routing for S ports
          // Route UP first to the top area of the board to avoid side ports (I/J)
          const isLeft = endX < startX;
          const sideX = isLeft 
            ? boardRect.left - 50 - svgRect.left - portOffset
            : boardRect.right + 50 - svgRect.left + portOffset;
            
          // Bypass Y: near the top of the board but below the very top edge
          const bypassY = boardRect.top + 15 - svgRect.top - portOffset;
          
          d += `L ${startX} ${bypassY} `;
          d += `L ${sideX} ${bypassY} `;
          
          const midY = endY - 30 - (portOffset / 2);
          const isUnderBoard = endY > boardRect.bottom - svgRect.top;
          
          if (isUnderBoard) {
            // If component is below the board, route around the bottom
            const bottomBypassY = boardRect.bottom + 40 - svgRect.top + portOffset;
            d += `L ${sideX} ${bottomBypassY} `;
            d += `L ${endX} ${bottomBypassY} `;
          } else {
            // If component is to the side, route to its midY
            d += `L ${sideX} ${midY} `;
            d += `L ${endX} ${midY} `;
          }
          
          d += `L ${endX} ${endY}`;
        } else if (isM) {
          // 90-degree routing for M ports
          const dropY = Math.max(boardBottom, startY + 30) + portOffset;
          const midY = Math.max(dropY, endY - 30);
          d += `L ${startX} ${midY} `;
          d += `L ${endX} ${midY} `;
          d += `L ${endX} ${endY}`;
        } else {
          d += `L ${endX} ${startY} L ${endX} ${endY}`;
        }
        
        return d;
      };

      const getColor = (from: string, to: string) => {
        const port = from.includes('port-') ? from : to;
        if (port.includes('port-J')) return '#ef4444'; // Red
        if (port.includes('port-S')) return '#f97316'; // Orange
        if (port.includes('port-M')) return '#22c55e'; // Green
        if (port.includes('port-I')) return '#3b82f6'; // Blue
        return '#475569'; // Default Gray
      };

      wires.forEach((wire, i) => {
        const d = calcPath(wire.from, wire.to, false);
        if (d) {
          newPaths.push({ id: `wire-${i}`, d, color: getColor(wire.from, wire.to), isDashed: false });
        }
      });
      
      if (drawingWireFrom) {
        const d = calcPath(drawingWireFrom, 'mouse-tracker', true);
        if (d) {
          newPaths.push({ id: 'wire-drawing', d, color: getColor(drawingWireFrom, 'mouse-tracker'), isDashed: true });
        }
      }
      
      setPaths(newPaths);
      frameId = requestAnimationFrame(updatePaths);
    };
    
    frameId = requestAnimationFrame(updatePaths);
    return () => cancelAnimationFrame(frameId);
  }, [wires, drawingWireFrom, resizeTrigger]);

  return (
    <svg id="wire-canvas-svg" className="absolute inset-0 w-full h-full pointer-events-none z-50">
      <style>
        {`
          @keyframes dash {
            to {
              stroke-dashoffset: -20;
            }
          }
          .animate-dash {
            animation: dash 1s linear infinite;
          }
        `}
      </style>
      {paths.map(p => (
        <path
          key={p.id}
          d={p.d}
          fill="none"
          stroke={p.color}
          strokeWidth={4}
          strokeDasharray={p.isDashed ? "8,8" : "none"}
          className={p.isDashed ? "animate-dash" : ""}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
};

export default function App() {
  const blocklyDiv = useRef<HTMLDivElement>(null);
  const workspace = useRef<Blockly.WorkspaceSvg | null>(null);
  const boardRef = useRef<any>(null);

  // Wire drawing state
  const [wires, setWires] = useState<{ from: string; to: string }[]>([]);
  const [drawingWireFrom, setDrawingWireFrom] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [droppedComponents, setDroppedComponents] = useState<{ id: string, compBase: any, x: number, y: number }[]>([]);
  const [isSimulationExpanded, setIsSimulationExpanded] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [resizeTrigger, setResizeTrigger] = useState(0);
  const [motorStates, setMotorStates] = useState<{ [key: string]: { direction: string, speed: number } }>({});
  const [servoStates, setServoStates] = useState<{ [key: string]: number }>({
    'S1': 90, 'S2': 90, 'S3': 90, 'S4': 90
  });
  const [ultrasonicDistances, setUltrasonicDistances] = useState<{ [compId: string]: number }>({});
  const [ledColors, setLedColors] = useState<{ [compId: string]: string }>({});
  const [pinStates, setPinStates] = useState<{ [key: string]: number }>({});
  const [colorSensorValues, setColorSensorValues] = useState<{ [compId: string]: string }>({});
  const [lightLevels, setLightLevels] = useState<{ [compId: string]: number }>({});

  const getMotorStateForComponent = (compId: string) => {
    const wire = wires.find(w => 
      (w.from === compId && w.to.startsWith('port-M')) || 
      (w.to === compId && w.from.startsWith('port-M'))
    );
    if (wire) {
      const portId = wire.from.startsWith('port-M') ? wire.from : wire.to;
      const portName = portId.replace('port-', '');
      return motorStates[portName];
    }
    return undefined;
  };

  const getServoAngleForComponent = (compId: string) => {
    const wire = wires.find(w => 
      (w.from === compId && w.to.startsWith('port-S')) || 
      (w.to === compId && w.from.startsWith('port-S'))
    );
    if (wire) {
      const portId = wire.from.startsWith('port-S') ? wire.from : wire.to;
      const portName = portId.replace('port-', '');
      return servoStates[portName];
    }
    return undefined;
  };

  const getLedStateForComponent = (compId: string) => {
    const wire = wires.find(w => 
      (w.from === compId && (w.to.startsWith('port-I') || w.to.startsWith('port-J'))) || 
      (w.to === compId && (w.from.startsWith('port-I') || w.from.startsWith('port-J')))
    );
    if (wire) {
      const portId = wire.from.startsWith('port-') ? wire.from : wire.to;
      const portName = portId.replace('port-', '');
      return pinStates[portName] === 1;
    }
    return false;
  };

  const getUltrasonicDistanceForPort = async (port: string) => {
    const portId = `port-${port}`;
    const wire = wires.find(w => w.from === portId || w.to === portId);
    if (wire) {
      const compId = wire.from === portId ? wire.to : wire.from;
      return ultrasonicDistances[compId] || 100;
    }
    return 0;
  };
  
  const getColorForPort = async (port: string) => {
    const portId = `port-${port}`;
    const wire = wires.find(w => w.from === portId || w.to === portId);
    if (wire) {
      const compId = wire.from === portId ? wire.to : wire.from;
      return colorSensorValues[compId] || 'None';
    }
    return 'None';
  };

  const getLightLevelForPort = async (port: string) => {
    const portId = `port-${port}`;
    const wire = wires.find(w => w.from === portId || w.to === portId);
    if (wire) {
      const compId = wire.from === portId ? wire.to : wire.from;
      return lightLevels[compId] || 0;
    }
    return 0;
  };

  useEffect(() => {
    const handleResize = () => setResizeTrigger(prev => prev + 1);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (drawingWireFrom) {
        setMousePos({ x: e.clientX, y: e.clientY });
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [drawingWireFrom]);

  useEffect(() => {
    if (blocklyDiv.current && !workspace.current) {
      workspace.current = Blockly.inject(blocklyDiv.current, {
        toolbox: {
          kind: 'categoryToolbox',
          contents: [
            {
              kind: 'category',
              name: 'Events',
              colour: '#FFBF00',
              cssConfig: {
                row: 'blocklyTreeRowCustom events-category'
              },
              contents: [
                { kind: 'block', type: 'event_when_green_flag_clicked' },
                { kind: 'block', type: 'microbit_button_pressed' },
              ],
            },
            {
              kind: 'category',
              name: 'Micro:bit',
              colour: '#4C97FF',
              cssConfig: {
                row: 'blocklyTreeRowCustom microbit-category'
              },
              contents: [
                { kind: 'block', type: 'microbit_show_icon' },
                { kind: 'block', type: 'microbit_show_text' },
                { kind: 'block', type: 'microbit_set_led_color' },
                { kind: 'block', type: 'microbit_led_toggle' },
                { kind: 'block', type: 'microbit_set_pin' },
                { kind: 'block', type: 'microbit_set_motor' },
                { kind: 'block', type: 'microbit_set_servo' },
                { kind: 'block', type: 'microbit_play_tone' },
              ],
            },
            {
              kind: 'category',
              name: 'Sensors',
              colour: '#9966FF',
              cssConfig: {
                row: 'blocklyTreeRowCustom sensors-category'
              },
              contents: [
                { kind: 'block', type: 'microbit_ultrasonic_distance' },
                { kind: 'block', type: 'microbit_color_sensor' },
                { kind: 'block', type: 'microbit_light_sensor' },
              ],
            },
            {
              kind: 'category',
              name: 'Sound',
              colour: '#0FBD8C',
              cssConfig: {
                row: 'blocklyTreeRowCustom sound-category'
              },
              contents: [
                { kind: 'block', type: 'microbit_play_tone' },
              ],
            },
            {
              kind: 'category',
              name: 'Control',
              colour: '#FFAB19',
              cssConfig: {
                row: 'blocklyTreeRowCustom control-category'
              },
              contents: [
                { kind: 'block', type: 'control_wait' },
                { kind: 'block', type: 'control_wait_until' },
                { kind: 'block', type: 'control_repeat' },
                { kind: 'block', type: 'control_forever' },
                { kind: 'block', type: 'control_if' },
                { kind: 'block', type: 'control_if_else' },
              ],
            },
            {
              kind: 'category',
              name: 'Operators',
              colour: '#59C059',
              cssConfig: {
                row: 'blocklyTreeRowCustom operators-category'
              },
              contents: [
                { kind: 'block', type: 'math_number' },
                { kind: 'block', type: 'logic_boolean' },
                {
                  kind: 'block',
                  type: 'operator_add',
                  inputs: {
                    NUM1: { shadow: { type: 'math_number', fields: { NUM: 0 } } },
                    NUM2: { shadow: { type: 'math_number', fields: { NUM: 0 } } },
                  },
                },
                {
                  kind: 'block',
                  type: 'operator_subtract',
                  inputs: {
                    NUM1: { shadow: { type: 'math_number', fields: { NUM: 0 } } },
                    NUM2: { shadow: { type: 'math_number', fields: { NUM: 0 } } },
                  },
                },
                {
                  kind: 'block',
                  type: 'operator_multiply',
                  inputs: {
                    NUM1: { shadow: { type: 'math_number', fields: { NUM: 0 } } },
                    NUM2: { shadow: { type: 'math_number', fields: { NUM: 0 } } },
                  },
                },
                {
                  kind: 'block',
                  type: 'operator_divide',
                  inputs: {
                    NUM1: { shadow: { type: 'math_number', fields: { NUM: 0 } } },
                    NUM2: { shadow: { type: 'math_number', fields: { NUM: 0 } } },
                  },
                },
                {
                  kind: 'block',
                  type: 'operator_random',
                  inputs: {
                    FROM: { shadow: { type: 'math_number', fields: { NUM: 1 } } },
                    TO: { shadow: { type: 'math_number', fields: { NUM: 10 } } },
                  },
                },
                {
                  kind: 'block',
                  type: 'operator_lt',
                  inputs: {
                    OP1: { shadow: { type: 'math_number', fields: { NUM: 0 } } },
                    OP2: { shadow: { type: 'math_number', fields: { NUM: 0 } } },
                  },
                },
                {
                  kind: 'block',
                  type: 'operator_equals',
                  inputs: {
                    OP1: { shadow: { type: 'math_number', fields: { NUM: 0 } } },
                    OP2: { shadow: { type: 'math_number', fields: { NUM: 0 } } },
                  },
                },
                {
                  kind: 'block',
                  type: 'operator_gt',
                  inputs: {
                    OP1: { shadow: { type: 'math_number', fields: { NUM: 0 } } },
                    OP2: { shadow: { type: 'math_number', fields: { NUM: 0 } } },
                  },
                },
                { kind: 'block', type: 'operator_and' },
                { kind: 'block', type: 'operator_or' },
                { kind: 'block', type: 'operator_not' },
              ],
            },
            {
              kind: 'category',
              name: 'Variables',
              colour: '#FF8C1A',
              custom: 'VARIABLE',
              cssConfig: {
                row: 'blocklyTreeRowCustom variables-category'
              },
            },
          ],
        } as any,
        grid: { spacing: 20, length: 3, colour: '#ccc', snap: true },
        move: { 
          scrollbars: false,
          drag: true, 
          wheel: true 
        },
        scrollbars: true,
        zoom: {
          controls: true,
          wheel: true,
          startScale: 1.0,
          maxScale: 3,
          minScale: 0.3,
          scaleSpeed: 1.2,
          pinch: true
        },
        trashcan: true,
        renderer: 'zelos',
        theme: Blockly.Themes.Zelos,
      });
    }

    return () => {
      if (workspace.current) {
        workspace.current.dispose();
        workspace.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (workspace.current) {
      // Small delay to allow CSS transitions to complete before resizing Blockly
      setTimeout(() => {
        if (workspace.current) {
          Blockly.svgResize(workspace.current);
        }
      }, 50);
    }
  }, [isSimulationExpanded]);

  const executionIdRef = useRef(0);

  const runCode = () => {
    if (workspace.current) {
      executionIdRef.current += 1;
      const currentExecutionId = executionIdRef.current;
      
      const checkStop = () => {
        if (executionIdRef.current !== currentExecutionId) {
          throw new Error('Execution stopped');
        }
      };

      const code = javascriptGenerator.workspaceToCode(workspace.current);
      console.log('Generated code:', code);
      try {
        boardRef.current?.clear();
        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
        // eslint-disable-next-line no-new-func
        new AsyncFunction('boardRef', 'checkStop', code)(boardRef, checkStop);
        boardRef.current?.triggerGreenFlag();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const stopCode = () => {
    executionIdRef.current += 1;
    boardRef.current?.clear();
  };

  const handleNodeClick = (id: string) => {
    const existingWireIndex = wires.findIndex(w => w.from === id || w.to === id);

    if (!drawingWireFrom) {
      if (existingWireIndex !== -1) {
        // Disconnect existing wire
        const newWires = [...wires];
        newWires.splice(existingWireIndex, 1);
        setWires(newWires);
        setConnectionError(null);
      } else {
        // Start drawing a wire
        setDrawingWireFrom(id);
        setConnectionError(null);
      }
    } else {
      // Finish drawing a wire
      if (drawingWireFrom === id) {
        // Cancel drawing if clicking the same node
        setDrawingWireFrom(null);
        return;
      }

      if (existingWireIndex !== -1) {
        setConnectionError("This terminal is already connected.");
        setTimeout(() => setConnectionError(null), 3000);
        setDrawingWireFrom(null);
        return;
      }

      const isPort = (nodeId: string) => nodeId.startsWith('port-');
      const isComp = (nodeId: string) => nodeId.startsWith('comp-');

      // Rule: Cannot connect port to port, or component to component
      if ((isPort(drawingWireFrom) && isPort(id)) || (isComp(drawingWireFrom) && isComp(id))) {
        setConnectionError("Invalid connection: Must connect a port to a component.");
        setTimeout(() => setConnectionError(null), 3000);
        setDrawingWireFrom(null);
        return;
      }

      // Always route from Port to Component for consistent pathing
      let from = drawingWireFrom;
      let to = id;
      if (isComp(from) && isPort(to)) {
        from = id;
        to = drawingWireFrom;
      }

      // Rule: Servo motors can only connect to S1, S2, S3, S4
      // Rule: GeekServo can connect to S1-S4 OR M1-M4
      const isServoComp = to.includes('comp-servo');
      const isGeekServoComp = to.includes('comp-geekservo');
      const isSPort = from.includes('port-S');
      const isMPort = from.includes('port-M');
      
      if (isServoComp && !isSPort) {
        setConnectionError("Servo motors can only connect to S1, S2, S3, or S4.");
        setTimeout(() => setConnectionError(null), 3000);
        setDrawingWireFrom(null);
        return;
      }
      
      if (isGeekServoComp && !isSPort && !isMPort) {
        setConnectionError("Motor can only connect to S1-S4 or M1-M4.");
        setTimeout(() => setConnectionError(null), 3000);
        setDrawingWireFrom(null);
        return;
      }
      
      if (!isServoComp && !isGeekServoComp && isSPort) {
        setConnectionError("S1-S4 ports are reserved for Servo motors.");
        setTimeout(() => setConnectionError(null), 3000);
        setDrawingWireFrom(null);
        return;
      }

      setWires([...wires, { from, to }]);
      setDrawingWireFrom(null);
    }
  };

  const saveProject = () => {
    if (!workspace.current) return;
    const xml = Blockly.Xml.workspaceToDom(workspace.current);
    const xmlText = Blockly.Xml.domToText(xml);
    const projectData = {
      xml: xmlText,
      wires,
      droppedComponents
    };
    const blob = new Blob([JSON.stringify(projectData)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'stack-kidi-project.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const loadProject = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (re) => {
        try {
          const projectData = JSON.parse(re.target?.result as string);
          if (projectData.xml && workspace.current) {
            workspace.current.clear();
            const xml = Blockly.utils.xml.textToDom(projectData.xml);
            Blockly.Xml.domToWorkspace(xml, workspace.current);
          }
          if (projectData.wires) setWires(projectData.wires);
          if (projectData.droppedComponents) setDroppedComponents(projectData.droppedComponents);
        } catch (err) {
          console.error("Failed to load project", err);
          alert("קובץ לא תקין");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans overflow-hidden">
      <header className="bg-[#5188c1] p-4 flex items-center gap-4 border-b border-blue-400 z-50 relative shadow-md">
        <div className="flex items-center gap-4 mr-4">
          <img src="https://raw.githubusercontent.com/moshe1ch-kidi/bitkidssimulator/refs/heads/main/src/logo/bitkidi.png" alt="BITKIDI" className="h-20" referrerPolicy="no-referrer" />
          <h1 className="text-4xl font-black text-white tracking-tighter hidden sm:block">BITKIDI</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={runCode} className="bg-green-500 hover:bg-green-600 text-white p-2.5 rounded-xl shadow-lg border-b-4 border-green-700 active:border-b-0 active:translate-y-1 transition-all" title="Run Code">
            <Play size={24} fill="currentColor" />
          </button>
          <button onClick={stopCode} className="bg-red-500 hover:bg-red-600 text-white p-2.5 rounded-xl shadow-lg border-b-4 border-red-700 active:border-b-0 active:translate-y-1 transition-all" title="Stop Code">
            <Square size={24} fill="currentColor" />
          </button>
        </div>

        <div className="w-px h-10 bg-blue-400/50 mx-2"></div>

        <div className="flex items-center gap-2">
          <button onClick={saveProject} className="bg-white/20 hover:bg-white/30 text-white p-2.5 rounded-xl transition-all" title="Save Project">
            <Save size={24} />
          </button>
          <button onClick={loadProject} className="bg-white/20 hover:bg-white/30 text-white p-2.5 rounded-xl transition-all" title="Load Project">
            <FolderOpen size={24} />
          </button>
          <button 
            onClick={() => {
              if (window.confirm("האם אתה בטוח שברצונך לנקות את הכל?")) {
                setWires([]);
                setDroppedComponents([]);
                boardRef.current?.clear();
              }
            }} 
            className="bg-white/20 hover:bg-white/30 text-white p-2.5 rounded-xl transition-all"
            title="Clear Simulation"
          >
            <Trash2 size={24} />
          </button>
        </div>

        {connectionError ? (
          <div className="ml-auto text-sm font-bold text-white bg-red-500/80 px-4 py-2 rounded-full border border-red-400 shadow-sm animate-pulse">
            {connectionError}
          </div>
        ) : drawingWireFrom ? (
          <div className="ml-auto text-sm font-bold text-white bg-blue-400/50 px-4 py-2 rounded-full border border-blue-300 shadow-sm">
            לחץ על הדק נוסף לחיבור, או על אותו הדק לביטול
          </div>
        ) : (
          <div className="ml-auto text-sm font-bold text-white/90 bg-blue-900/20 px-4 py-2 rounded-full border border-blue-400/30">
            לחץ על הדק לחיבור חוט. לחץ על הדק מחובר להסרה.
          </div>
        )}
      </header>
      
      <main className={`flex-1 grid gap-4 p-4 relative h-full ${isSimulationExpanded ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
        <div className={`bg-white rounded-lg shadow-md h-full w-full z-10 relative no-scrollbar ${isSimulationExpanded ? 'hidden' : 'block'}`}>
          <div className="bg-[#f0f0f0] border-b border-gray-200 p-2 flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm overflow-hidden">
               <img src="https://img.icons8.com/color/48/000000/panda.png" alt="Panda" className="w-6 h-6" referrerPolicy="no-referrer" />
            </div>
            <span className="text-sm font-bold text-gray-600">Scripts for Micro:bit</span>
          </div>
          <div ref={blocklyDiv} className="h-[calc(100%-48px)] w-full"></div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md flex flex-row overflow-hidden relative z-0 h-full">
          <>
            <div className="flex flex-row w-full h-full p-4 relative z-10">
              {/* Left Side: Simulation Board */}
              <div id="simulation-container" className="flex-1 relative rounded-2xl shadow-inner border border-gray-200 overflow-hidden bg-gray-50">
                <WireCanvas wires={wires} drawingWireFrom={drawingWireFrom} mousePos={mousePos} resizeTrigger={resizeTrigger} />
                <div className="absolute inset-0 overflow-y-auto overflow-x-hidden p-6 flex flex-col items-center">
                  {/* Grid Background */}
                  <div 
                    className="absolute inset-0 opacity-[0.05] pointer-events-none" 
                    style={{ 
                      backgroundImage: 'linear-gradient(to right, #000000 1px, transparent 1px), linear-gradient(to bottom, #000000 1px, transparent 1px)', 
                      backgroundSize: '24px 24px',
                      minHeight: '1200px'
                    }}
                  ></div>
                  <div className="w-full flex justify-between items-center z-20 mb-2 px-2 sticky top-0 bg-gray-50/90 backdrop-blur-sm py-2 rounded-lg shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-800 tracking-wide">Simulation Board</h2>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} title="Zoom Out" className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-full transition-colors">
                        <ZoomOut size={18} />
                      </button>
                      <span className="text-xs font-medium text-gray-600 w-10 text-center select-none">{Math.round(zoomLevel * 100)}%</span>
                      <button onClick={() => setZoomLevel(z => Math.min(2, z + 0.1))} title="Zoom In" className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-full transition-colors">
                        <ZoomIn size={18} />
                      </button>
                      <button onClick={() => setZoomLevel(1)} title="Reset Zoom" className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-full transition-colors mr-2">
                        <RotateCcw size={16} />
                      </button>
                      <div className="w-px h-6 bg-gray-300 mx-1"></div>
                      <button
                        onClick={() => setIsSimulationExpanded(!isSimulationExpanded)}
                        className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-full transition-colors ml-1"
                        title={isSimulationExpanded ? "Restore View" : "Maximize Simulation"}
                      >
                        {isSimulationExpanded ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                      </button>
                    </div>
                  </div>
                  <div className="w-full flex justify-center mt-2" style={{ 
                      transform: `scale(${zoomLevel * 0.623})`, 
                      transformOrigin: 'top center', 
                      transition: 'transform 0.2s ease-out' 
                    }}>
                    <div id="simulation-board-wrapper" className="z-10 relative">
                      <MicrobitBoard 
                        ref={boardRef} 
                        onPinClick={handleNodeClick} 
                        motorStates={motorStates}
                        onMotorChange={(port, direction, speed) => {
                          setMotorStates(prev => ({ ...prev, [port]: { direction, speed } }));
                        }}
                        servoStates={servoStates}
                        onServoChange={(port, angle) => {
                          setServoStates(prev => ({ ...prev, [port]: angle }));
                        }}
                        onPinChange={(port, value) => {
                          setPinStates(prev => ({ ...prev, [port]: value }));
                        }}
                        getUltrasonicDistance={getUltrasonicDistanceForPort}
                        getColor={getColorForPort}
                        getLightLevel={getLightLevelForPort}
                      />
                      {droppedComponents.map(comp => (
                        <div key={comp.id} style={{ 
                          position: 'absolute', 
                          left: comp.x, 
                          top: comp.y,
                          transform: 'scale(1.42857)',
                          transformOrigin: 'center',
                          zIndex: 20
                        }}>
                          <DraggableComponent 
                            comp={{ ...comp.compBase, id: comp.id }} 
                            onComponentClick={handleNodeClick} 
                            isDropped={true} 
                            motorState={getMotorStateForComponent(comp.id)}
                            servoAngle={getServoAngleForComponent(comp.id)}
                            ultrasonicDistance={ultrasonicDistances[comp.id]}
                            onUltrasonicChange={(val) => {
                              setUltrasonicDistances(prev => ({ ...prev, [comp.id]: val }));
                            }}
                            ledColor={ledColors[comp.id] || '#ef4444'}
                            onLedColorChange={(color) => {
                              setLedColors(prev => ({ ...prev, [comp.id]: color }));
                            }}
                            ledOn={getLedStateForComponent(comp.id)}
                            colorValue={colorSensorValues[comp.id] || 'None'}
                            onColorValueChange={(val) => {
                              setColorSensorValues(prev => ({ ...prev, [comp.id]: val }));
                            }}
                            lightLevel={lightLevels[comp.id] || 0}
                            onLightLevelChange={(val) => {
                              setLightLevels(prev => ({ ...prev, [comp.id]: val }));
                            }}
                            onDelete={() => {
                              setDroppedComponents(prev => prev.filter(c => c.id !== comp.id));
                              setWires(prev => prev.filter(w => w.from !== comp.id && w.to !== comp.id));
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Divider */}
              <div className="w-px bg-gray-200 mx-4 shrink-0"></div>
              
              {/* Right Side: Components */}
              <div className="w-36 flex flex-col items-center shrink-0 p-2 overflow-y-auto relative z-20">
                <h2 className="text-lg font-semibold mb-4 text-center">Components</h2>
                <ElectronicComponents 
                  zoomLevel={zoomLevel * 0.623}
                  onComponentClick={handleNodeClick} 
                  onDropOnBoard={(compBase, id, x, y) => {
                    console.log('Drop on board detected:', compBase, id, x, y);
                    setDroppedComponents(prev => [...prev, { id, compBase, x, y }]);
                  }}
                />
              </div>
            </div>

            {drawingWireFrom && (
              <div id="mouse-tracker" style={{ position: 'fixed', left: mousePos.x, top: mousePos.y, width: 1, height: 1, pointerEvents: 'none', zIndex: 9999 }} />
            )}
          </>
        </div>
      </main>
    </div>
  );
}
