/**
 * @clawgame/web - Behavior Graph Visual Editor
 * Visual logic editor for M13 Gameplay Authoring Layer
 * Provides a drag-and-drop interface for creating behavior graphs
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { logger } from '../utils/logger';
import '../scene-editor.css';

type BehaviorNodeType = 'composite' | 'condition' | 'action' | 'decorator';

interface BehaviorNode {
  id: string;
  type: BehaviorNodeType;
  data: Record<string, unknown>;
  label: string;
}

interface BehaviorEdge {
  id: string;
  from: string;
  to: string;
}

interface BehaviorGraph {
  id: string;
  name: string;
  root: string;
  nodes: BehaviorNode[];
  edges: BehaviorEdge[];
  variables: Record<string, unknown>;
  tags: string[];
}

interface GraphNode {
  id: string;
  type: BehaviorNodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  data: any;
  label: string;
  selected: boolean;
}

interface GraphEdge {
  id: string;
  from: string;
  to: string;
  selected: boolean;
}

export function BehaviorGraphPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [graph, setGraph] = useState<BehaviorGraph | null>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [creatingEdge, setCreatingEdge] = useState<{ from: string | null, tempTo: { x: number, y: number } }>({ from: null, tempTo: { x: 0, y: 0 } });
  const [nodeContextMenu, setNodeContextMenu] = useState<{ nodeId: string, x: number, y: number } | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });

  const toast = useToast();

  // Initialize with a default graph
  useEffect(() => {
    const defaultGraph: BehaviorGraph = {
      id: 'behavior-graph-1',
      name: 'Enemy Behavior',
      root: 'root',
      nodes: [],
      edges: [],
      variables: {},
      tags: ['enemy', 'ai'],
    };
    
    setGraph(defaultGraph);
    createDefaultGraph();
  }, []);

  const createDefaultGraph = () => {
    const defaultNodes: GraphNode[] = [
      {
        id: 'root',
        type: 'composite',
        x: 400,
        y: 100,
        width: 120,
        height: 60,
        data: { type: 'composite', composite: { kind: 'sequence' } },
        label: 'Start',
        selected: false,
      },
      {
        id: 'patrol',
        type: 'action',
        x: 400,
        y: 250,
        width: 120,
        height: 60,
        data: { type: 'action', action: { kind: 'move-to', x: 400, y: 300 } },
        label: 'Patrol',
        selected: false,
      },
      {
        id: 'chase',
        type: 'action',
        x: 600,
        y: 250,
        width: 120,
        height: 60,
        data: { type: 'action', action: { kind: 'move-toward-entity', targetId: 'player' } },
        label: 'Chase Player',
        selected: false,
      },
      {
        id: 'in-range',
        type: 'condition',
        x: 500,
        y: 180,
        width: 120,
        height: 60,
        data: { type: 'condition', condition: { kind: 'entity-in-range', targetId: 'player', range: 200 } },
        label: 'Player Near?',
        selected: false,
      },
    ];

    const defaultEdges: GraphEdge[] = [
      { id: 'e1', from: 'root', to: 'in-range', selected: false },
      { id: 'e2', from: 'in-range', to: 'patrol', selected: false },
      { id: 'e3', from: 'in-range', to: 'chase', selected: false },
    ];

    setNodes(defaultNodes);
    setEdges(defaultEdges);
  };

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      render(ctx);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [nodes, edges, viewport, creatingEdge]);

  const render = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Apply viewport transform
    ctx.save();
    ctx.translate(viewport.x, viewport.y);
    ctx.scale(viewport.zoom, viewport.zoom);

    // Draw grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = -1000; x < 2000; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, -1000);
      ctx.lineTo(x, 2000);
      ctx.stroke();
    }
    for (let y = -1000; y < 2000; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(-1000, y);
      ctx.lineTo(2000, y);
      ctx.stroke();
    }

    // Draw edges
    edges.forEach(edge => {
      const fromNode = nodes.find(n => n.id === edge.from);
      const toNode = nodes.find(n => n.id === edge.to);
      if (!fromNode || !toNode) return;

      ctx.strokeStyle = edge.selected ? '#4ade80' : '#666';
      ctx.lineWidth = edge.selected ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(fromNode.x + fromNode.width / 2, fromNode.y + fromNode.height);
      ctx.lineTo(toNode.x + toNode.width / 2, toNode.y);
      ctx.stroke();

      // Arrow
      drawArrow(ctx, fromNode.x + fromNode.width / 2, fromNode.y + fromNode.height, toNode.x + toNode.width / 2, toNode.y);
    });

    // Draw temporary edge if creating
    if (creatingEdge.from) {
      const fromNode = nodes.find(n => n.id === creatingEdge.from);
      if (fromNode) {
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(fromNode.x + fromNode.width / 2, fromNode.y + fromNode.height);
        ctx.lineTo(creatingEdge.tempTo.x, creatingEdge.tempTo.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Draw nodes
    nodes.forEach(node => {
      // Node background
      ctx.fillStyle = node.selected ? '#3b82f6' : (node.type === 'composite' ? '#8b5cf6' : 
                                                  node.type === 'decorator' ? '#f59e0b' : 
                                                  node.type === 'condition' ? '#10b981' : '#ef4444');
      ctx.fillRect(node.x, node.y, node.width, node.height);
      
      // Node border
      ctx.strokeStyle = node.selected ? '#fff' : '#333';
      ctx.lineWidth = node.selected ? 3 : 2;
      ctx.strokeRect(node.x, node.y, node.width, node.height);

      // Node text
      ctx.fillStyle = '#fff';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.label, node.x + node.width / 2, node.y + node.height / 2);
    });

    ctx.restore();
  };

  const drawArrow = (ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number) => {
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const arrowLength = 10;
    
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - arrowLength * Math.cos(angle - Math.PI / 6), toY - arrowLength * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - arrowLength * Math.cos(angle + Math.PI / 6), toY - arrowLength * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - viewport.x) / viewport.zoom;
    const y = (e.clientY - rect.top - viewport.y) / viewport.zoom;

    // Check if clicking on a node
    const clickedNode = nodes.find(node => 
      x >= node.x && x <= node.x + node.width &&
      y >= node.y && y <= node.y + node.height
    );

    if (clickedNode) {
      if (e.shiftKey && selectedNode) {
        // Start creating edge
        setCreatingEdge({ from: selectedNode, tempTo: { x, y } });
      } else {
        // Select and drag node
        setSelectedNode(clickedNode.id);
        setSelectedEdge(null);
        setDraggingNode(clickedNode.id);
        setDragOffset({
          x: x - clickedNode.x,
          y: y - clickedNode.y,
        });
      }
    } else {
      // Clicked on empty space - create new node
      createNodeAt(x, y);
      setSelectedNode(null);
      setSelectedEdge(null);
      setNodeContextMenu(null);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - viewport.x) / viewport.zoom;
    const y = (e.clientY - rect.top - viewport.y) / viewport.zoom;

    if (draggingNode) {
      // Update node position
      setNodes(prev => prev.map(node => 
        node.id === draggingNode 
          ? { ...node, x: x - dragOffset.x, y: y - dragOffset.y }
          : node
      ));
    } else if (creatingEdge.from) {
      // Update temporary edge endpoint
      setCreatingEdge(prev => ({ ...prev, tempTo: { x, y } }));
    }

    // Show hover cursor
    const hoverNode = nodes.find(node => 
      x >= node.x && x <= node.x + node.width &&
      y >= node.y && y <= node.y + node.height
    );
    canvas.style.cursor = hoverNode ? 'pointer' : 'crosshair';
  };

  const handleCanvasMouseUp = () => {
    if (creatingEdge.from && creatingEdge.from !== selectedNode) {
      // Complete edge creation
      const edgeId = `edge-${Date.now()}`;
      setEdges(prev => [...prev, { id: edgeId, from: creatingEdge.from!, to: selectedNode!, selected: false }]);
    }
    
    setDraggingNode(null);
    setCreatingEdge({ from: null, tempTo: { x: 0, y: 0 } });
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - viewport.x) / viewport.zoom;
    const y = (e.clientY - rect.top - viewport.y) / viewport.zoom;

    const clickedNode = nodes.find(node => 
      x >= node.x && x <= node.x + node.width &&
      y >= node.y && y <= node.y + node.height
    );

    if (clickedNode) {
      if (e.shiftKey) {
        // Toggle selection for multi-select
        setNodes(prev => prev.map(node => 
          node.id === clickedNode.id 
            ? { ...node, selected: !node.selected }
            : node
        ));
      } else {
        setSelectedNode(clickedNode.id);
        setSelectedEdge(null);
      }
    } else {
      setSelectedNode(null);
      setSelectedEdge(null);
    }
  };

  const createNodeAt = (x: number, y: number) => {
    const nodeTypes: BehaviorNodeType[] = ['composite', 'condition', 'action', 'decorator'];
    const randomType = nodeTypes[Math.floor(Math.random() * nodeTypes.length)];
    
    const newNode: GraphNode = {
      id: `node-${Date.now()}`,
      type: randomType,
      x: x - 60,
      y: y - 30,
      width: 120,
      height: 60,
      data: getDefaultDataForType(randomType),
      label: getDefaultLabelForType(randomType),
      selected: false,
    };

    setNodes(prev => [...prev, newNode]);
  };

  const getDefaultDataForType = (type: BehaviorNodeType): any => {
    switch (type) {
      case 'composite':
        return { type: 'composite', composite: { kind: 'sequence' } };
      case 'condition':
        return { type: 'condition', condition: { kind: 'always' } };
      case 'action':
        return { type: 'action', action: { kind: 'move-to', x: 0, y: 0 } };
      case 'decorator':
        return { type: 'decorator', decorator: { kind: 'inverter' } };
      default:
        return {};
    }
  };

  const getDefaultLabelForType = (type: BehaviorNodeType): string => {
    switch (type) {
      case 'composite':
        return 'Sequence';
      case 'condition':
        return 'Condition';
      case 'action':
        return 'Action';
      case 'decorator':
        return 'Decorator';
      default:
        return 'Node';
    }
  };

  const handleDeleteSelected = () => {
    if (selectedNode) {
      setNodes(prev => prev.filter(node => node.id !== selectedNode));
      setEdges(prev => prev.filter(edge => edge.from !== selectedNode && edge.to !== selectedNode));
      setSelectedNode(null);
    }
    if (selectedEdge) {
      setEdges(prev => prev.filter(edge => edge.id !== selectedEdge));
      setSelectedEdge(null);
    }
  };

  const handleZoom = (direction: 'in' | 'out') => {
    setViewport(prev => ({
      ...prev,
      zoom: Math.max(0.1, Math.min(3, prev.zoom * (direction === 'in' ? 1.2 : 0.8))),
    }));
  };

  const handlePan = (dx: number, dy: number) => {
    setViewport(prev => ({
      ...prev,
      x: prev.x + dx,
      y: prev.y + dy,
    }));
  };

  const handleSaveGraph = () => {
    // Convert visual graph back to BehaviorGraph
    const behaviorGraph: BehaviorGraph = {
      id: graph?.id || 'behavior-graph-1',
      name: graph?.name || 'Behavior Graph',
      root: nodes.find(n => n.x < 200 && n.y < 200)?.id || nodes[0]?.id || '',
      nodes: nodes.map(node => ({
        id: node.id,
        type: node.type,
        data: node.data,
        label: node.label,
      })),
      edges: edges.map(edge => ({
        id: edge.id,
        from: edge.from,
        to: edge.to,
      })),
      variables: graph?.variables || {},
      tags: graph?.tags || [],
    };

    setGraph(behaviorGraph);
    toast.showToast({ type: 'success', message: 'Behavior graph saved!' });
  };

  const handleResetView = () => {
    setViewport({ x: 0, y: 0, zoom: 1 });
  };

  return (
    <div className="app-layout behavior-graph-editor">
      <div className="behavior-graph-header">
        <div className="graph-title">
          <h1>Behavior Graph Editor</h1>
          <p>Visual logic editor for enemy and NPC behaviors</p>
        </div>
        
        <div className="editor-controls">
          <div className="control-group">
            <button className="btn-secondary btn-sm" onClick={() => handleZoom('out')}>
              Zoom Out
            </button>
            <button className="btn-secondary btn-sm" onClick={() => handleZoom('in')}>
              Zoom In
            </button>
            <button className="btn-secondary btn-sm" onClick={handleResetView}>
              Reset View
            </button>
          </div>
          
          <div className="control-group">
            <button className="btn-primary btn-sm" onClick={handleSaveGraph}>
              Save Graph
            </button>
            <button className="btn-danger btn-sm" onClick={handleDeleteSelected}>
              Delete Selected
            </button>
          </div>
        </div>
      </div>

      <div className="graph-toolbar">
        <div className="toolbar-group">
          <span className="toolbar-label">Add Node:</span>
          <button 
            className="btn-secondary btn-sm" 
            onClick={() => createNodeAt(200, 200)}
          >
            + Composite
          </button>
          <button 
            className="btn-secondary btn-sm" 
            onClick={() => createNodeAt(300, 200)}
          >
            + Condition
          </button>
          <button 
            className="btn-secondary btn-sm" 
            onClick={() => createNodeAt(400, 200)}
          >
            + Action
          </button>
          <button 
            className="btn-secondary btn-sm" 
            onClick={() => createNodeAt(500, 200)}
          >
            + Decorator
          </button>
        </div>
        
        <div className="toolbar-group">
          <span className="toolbar-label">Instructions:</span>
          <span className="toolbar-help">
            Click to create nodes • Shift+Click to connect nodes • Drag to move nodes
          </span>
        </div>
      </div>

      <div 
        ref={containerRef}
        className="scene-canvas-container"
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onClick={handleCanvasClick}
      >
        <canvas ref={canvasRef} className="scene-canvas" />
      </div>
    </div>
  );
}
