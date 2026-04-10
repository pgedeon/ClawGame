/**
 * @clawgame/web - Navigation Waypoint Editor
 * Visual editor for creating and editing waypoint-based navigation paths
 * Provides a drag-and-drop interface for placing waypoints and defining navigation routes
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  NavigationSystem,
  createWaypoint,
  createNavigationPath,
  type Waypoint,
  type NavigationPath,
  type NavigationState,
} from '@clawgame/engine';
import { useToast } from '../components/Toast';
import { logger } from '../utils/logger';
import '../scene-editor.css';

interface WaypointNode {
  id: string;
  x: number;
  y: number;
  radius: number;
  waitTime: number;
  label: string;
  selected: boolean;
  isGhost: boolean;
}

interface NavigationPathData {
  id: string;
  name: string;
  waypoints: string[];
  loop: boolean;
  speedMultiplier: number;
}

export function NavigationPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [waypoints, setWaypoints] = useState<WaypointNode[]>([]);
  const [paths, setPaths] = useState<NavigationPathData[]>([]);
  const [selectedWaypoint, setSelectedWaypoint] = useState<string | null>(null);
  const [draggingWaypoint, setDraggingWaypoint] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [creatingPath, setCreatingPath] = useState<{ from: string | null, previewTo: { x: number, y: number } }>({ from: null, previewTo: { x: 0, y: 0 } });
  const [waypointContextMenu, setWaypointContextMenu] = useState<{ waypointId: string, x: number, y: number } | null>(null);
  const [newPathName, setNewPathName] = useState('New Path');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [mode, setMode] = useState<'select' | 'add' | 'connect'>('add');

  // Initialize with default data
  useEffect(() => {
    const defaultWaypoints: WaypointNode[] = [
      {
        id: 'wp-1',
        x: 100,
        y: 100,
        radius: 20,
        waitTime: 0,
        label: 'Start',
        selected: false,
        isGhost: false,
      },
      {
        id: 'wp-2', 
        x: 300,
        y: 200,
        radius: 20,
        waitTime: 1,
        label: 'Checkpoint',
        selected: false,
        isGhost: false,
      },
      {
        id: 'wp-3',
        x: 200,
        y: 350,
        radius: 20,
        waitTime: 0,
        label: 'End',
        selected: false,
        isGhost: false,
      },
    ];

    const defaultPath: NavigationPathData = {
      id: 'path-1',
      name: 'Patrol Route',
      waypoints: ['wp-1', 'wp-2', 'wp-3'],
      loop: true,
      speedMultiplier: 1.0,
    };

    setWaypoints(defaultWaypoints);
    setPaths([defaultPath]);
  }, []);

  // Handle mouse events on canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Convert to world coordinates
    const worldX = (x - viewport.x) / viewport.zoom;
    const worldY = (y - viewport.y) / viewport.zoom;

    if (mode === 'add') {
      // Add new waypoint
      const newWaypoint: WaypointNode = {
        id: `wp-${Date.now()}`,
        x: worldX,
        y: worldY,
        radius: 20,
        waitTime: 0,
        label: `Waypoint ${waypoints.length + 1}`,
        selected: false,
        isGhost: false,
      };
      setWaypoints([...waypoints, newWaypoint]);
    } else if (mode === 'connect') {
      // Check if clicking on a waypoint
      const clickedWaypoint = waypoints.find(wp => {
        const dx = worldX - wp.x;
        const dy = worldY - wp.y;
        return Math.sqrt(dx * dx + dy * dy) <= wp.radius;
      });

      if (clickedWaypoint) {
        if (creatingPath.from === null) {
          setCreatingPath({ from: clickedWaypoint.id, previewTo: { x: worldX, y: worldY } });
        } else if (creatingPath.from !== clickedWaypoint.id) {
          // Create or add to path
          const fromWaypoint = waypoints.find(wp => wp.id === creatingPath.from);
          if (fromWaypoint) {
            // Find existing path that contains fromWaypoint
            const existingPathIndex = paths.findIndex(path => 
              path.waypoints.includes(creatingPath.from!)
            );
            
            if (existingPathIndex >= 0) {
              // Add to existing path
              const updatedPath = { ...paths[existingPathIndex] };
              if (!updatedPath.waypoints.includes(clickedWaypoint.id)) {
                updatedPath.waypoints.push(clickedWaypoint.id);
                const newPaths = [...paths];
                newPaths[existingPathIndex] = updatedPath;
                setPaths(newPaths);
              }
            } else {
              // Create new path
              const newPath: NavigationPathData = {
                id: `path-${Date.now()}`,
                name: newPathName,
                waypoints: [creatingPath.from, clickedWaypoint.id],
                loop: false,
                speedMultiplier: 1.0,
              };
              setPaths([...paths, newPath]);
            }
          }
          setCreatingPath({ from: null, previewTo: { x: 0, y: 0 } });
        }
      }
    } else {
      // Select mode - check if clicking on a waypoint
      const clickedWaypoint = waypoints.find(wp => {
        const dx = worldX - wp.x;
        const dy = worldY - wp.y;
        return Math.sqrt(dx * dx + dy * dy) <= wp.radius;
      });

      if (clickedWaypoint) {
        const updatedWaypoints = waypoints.map(wp => ({
          ...wp,
          selected: wp.id === clickedWaypoint.id,
        }));
        setWaypoints(updatedWaypoints);
        setSelectedWaypoint(clickedWaypoint.id);
      } else {
        // Clicked empty space - deselect all
        const updatedWaypoints = waypoints.map(wp => ({ ...wp, selected: false }));
        setWaypoints(updatedWaypoints);
        setSelectedWaypoint(null);
      }
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Convert to world coordinates
    const worldX = (x - viewport.x) / viewport.zoom;
    const worldY = (y - viewport.y) / viewport.zoom;

    // Update path preview in connect mode
    if (creatingPath.from !== null) {
      setCreatingPath({ ...creatingPath, previewTo: { x: worldX, y: worldY } });
    }

    // Handle dragging waypoints
    if (draggingWaypoint !== null) {
      const updatedWaypoints = waypoints.map(wp => {
        if (wp.id === draggingWaypoint) {
          return { ...wp, x: worldX - dragOffset.x, y: worldY - dragOffset.y };
        }
        return wp;
      });
      setWaypoints(updatedWaypoints);
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || mode !== 'select') return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const worldX = (x - viewport.x) / viewport.zoom;
    const worldY = (y - viewport.y) / viewport.zoom;

    // Check if clicking on a waypoint to start dragging
    const clickedWaypoint = waypoints.find(wp => {
      const dx = worldX - wp.x;
      const dy = worldY - wp.y;
      return Math.sqrt(dx * dx + dy * dy) <= wp.radius;
    });

    if (clickedWaypoint) {
      setDraggingWaypoint(clickedWaypoint.id);
      setDragOffset({ x: worldX - clickedWaypoint.x, y: worldY - clickedWaypoint.y });
    }
  };

  const handleCanvasMouseUp = () => {
    setDraggingWaypoint(null);
  };

  const deleteSelectedWaypoint = () => {
    if (selectedWaypoint) {
      const updatedWaypoints = waypoints.filter(wp => wp.id !== selectedWaypoint);
      setWaypoints(updatedWaypoints);
      
      // Remove from all paths
      const updatedPaths = paths.map(path => ({
        ...path,
        waypoints: path.waypoints.filter(wpId => wpId !== selectedWaypoint),
      })).filter(path => path.waypoints.length > 1); // Keep paths with at least 2 waypoints
      
      setPaths(updatedPaths);
      setSelectedWaypoint(null);
      setWaypointContextMenu(null);
      toast.showToast({ type: 'success', message: 'Waypoint deleted' });
    }
  };

  const exportNavigationData = () => {
    const navigationData = {
      waypoints: waypoints.map(wp => ({
        id: wp.id,
        x: wp.x,
        y: wp.y,
        radius: wp.radius,
        waitTime: wp.waitTime,
        label: wp.label,
      })),
      paths: paths.map(path => ({
        id: path.id,
        name: path.name,
        waypoints: path.waypoints,
        loop: path.loop,
        speedMultiplier: path.speedMultiplier,
      })),
    };

    const blob = new Blob([JSON.stringify(navigationData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `navigation-${projectId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.showToast({ type: 'success', message: 'Navigation data exported' });
  };

  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply viewport transform
    ctx.save();
    ctx.translate(viewport.x, viewport.y);
    ctx.scale(viewport.zoom, viewport.zoom);

    // Draw grid
    const gridSize = 50;
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1 / viewport.zoom;
    ctx.globalAlpha = 0.3;

    const startX = Math.floor(-viewport.x / viewport.zoom / gridSize) * gridSize;
    const startY = Math.floor(-viewport.y / viewport.zoom / gridSize) * gridSize;
    const endX = startX + (canvas.width / viewport.zoom) + gridSize;
    const endY = startY + (canvas.height / viewport.zoom) + gridSize;

    for (let x = startX; x <= endX; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
      ctx.stroke();
    }

    for (let y = startY; y <= endY; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;

    // Draw navigation paths
    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = 2 / viewport.zoom;
    
    paths.forEach(path => {
      const pathWaypoints = waypoints.filter(wp => path.waypoints.includes(wp.id));
      if (pathWaypoints.length < 2) return;

      ctx.beginPath();
      ctx.moveTo(pathWaypoints[0].x, pathWaypoints[0].y);
      
      for (let i = 1; i < pathWaypoints.length; i++) {
        ctx.lineTo(pathWaypoints[i].x, pathWaypoints[i].y);
      }
      
      if (path.loop && pathWaypoints.length > 2) {
        ctx.lineTo(pathWaypoints[0].x, pathWaypoints[0].y);
      }
      
      ctx.stroke();

      // Draw arrowheads
      for (let i = 0; i < pathWaypoints.length - 1; i++) {
        const from = pathWaypoints[i];
        const to = pathWaypoints[i + 1];
        drawArrow(ctx, from.x, from.y, to.x, to.y);
      }

      if (path.loop && pathWaypoints.length > 2) {
        const from = pathWaypoints[pathWaypoints.length - 1];
        const to = pathWaypoints[0];
        drawArrow(ctx, from.x, from.y, to.x, to.y);
      }
    });

    // Draw path preview in connect mode
    if (creatingPath.from !== null) {
      const fromWaypoint = waypoints.find(wp => wp.id === creatingPath.from);
      if (fromWaypoint) {
        ctx.strokeStyle = '#9333ea';
        ctx.lineWidth = 2 / viewport.zoom;
        ctx.setLineDash([5 / viewport.zoom, 5 / viewport.zoom]);
        ctx.beginPath();
        ctx.moveTo(fromWaypoint.x, fromWaypoint.y);
        ctx.lineTo(creatingPath.previewTo.x, creatingPath.previewTo.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Draw waypoints
    waypoints.forEach(waypoint => {
      // Draw waypoint circle
      ctx.fillStyle = waypoint.selected ? '#f59e0b' : (waypoint.isGhost ? '#6b7280' : '#10b981');
      ctx.strokeStyle = waypoint.selected ? '#d97706' : '#059669';
      ctx.lineWidth = 2 / viewport.zoom;
      
      ctx.beginPath();
      ctx.arc(waypoint.x, waypoint.y, waypoint.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Draw waypoint label
      ctx.fillStyle = '#fff';
      ctx.font = `${12 / viewport.zoom}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(waypoint.label, waypoint.x, waypoint.y);

      // Draw radius indicator
      ctx.strokeStyle = '#6b7280';
      ctx.lineWidth = 1 / viewport.zoom;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(waypoint.x, waypoint.y, waypoint.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    ctx.restore();
  };

  const drawArrow = (ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number) => {
    const headLength = 10 / viewport.zoom;
    const angle = Math.atan2(toY - fromY, toX - fromX);

    // Offset arrow to start at edge of waypoint
    const distance = Math.sqrt((toX - fromX) ** 2 + (toY - fromY) ** 2);
    const offsetRatio = 20 / distance; // waypoint radius / distance
    const arrowStartX = fromX + (toX - fromX) * offsetRatio;
    const arrowStartY = fromY + (toY - fromY) * offsetRatio;
    const arrowEndX = toX - (toX - fromX) * offsetRatio;
    const arrowEndY = toY - (toY - fromY) * offsetRatio;

    ctx.beginPath();
    ctx.moveTo(arrowEndX, arrowEndY);
    ctx.lineTo(arrowEndX - headLength * Math.cos(angle - Math.PI / 6), arrowEndY - headLength * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(arrowEndX, arrowEndY);
    ctx.lineTo(arrowEndX - headLength * Math.cos(angle + Math.PI / 6), arrowEndY - headLength * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  };

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      if (containerRef.current) {
        canvas.width = containerRef.current.clientWidth;
        canvas.height = containerRef.current.clientHeight;
        render();
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const animationId = requestAnimationFrame(function animate() {
      render();
      requestAnimationFrame(animate);
    });

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, [waypoints, paths, viewport, creatingPath]);

  return (
    <div className="navigation-page">
      <div className="page-header">
        <h1>Navigation Waypoint Editor</h1>
        <div className="toolbar">
          <button 
            className={`mode-btn ${mode === 'add' ? 'active' : ''}`}
            onClick={() => setMode('add')}
          >
            Add Waypoint
          </button>
          <button 
            className={`mode-btn ${mode === 'connect' ? 'active' : ''}`}
            onClick={() => setMode('connect')}
          >
            Connect Waypoints
          </button>
          <button 
            className={`mode-btn ${mode === 'select' ? 'active' : ''}`}
            onClick={() => setMode('select')}
          >
            Select
          </button>
          <button className="primary-btn" onClick={exportNavigationData}>
            Export Data
          </button>
        </div>
      </div>

      <div className="page-content">
        <div className="navigation-canvas-container" ref={containerRef}>
          <canvas
            ref={canvasRef}
            className="navigation-canvas"
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMouseMove}
            onMouseDown={handleCanvasMouseDown}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          />
        </div>

        <div className="navigation-sidebar">
          <div className="sidebar-section">
            <h3>Paths</h3>
            <div className="path-list">
              {paths.map(path => (
                <div key={path.id} className="path-item">
                  <div className="path-name">{path.name}</div>
                  <div className="path-info">
                    {path.waypoints.length} waypoints | {path.loop ? 'Loop' : 'One-way'} | {path.speedMultiplier}x speed
                  </div>
                </div>
              ))}
            </div>
            <input
              type="text"
              value={newPathName}
              onChange={(e) => setNewPathName(e.target.value)}
              className="path-name-input"
              placeholder="Path name..."
            />
          </div>

          <div className="sidebar-section">
            <h3>Instructions</h3>
            <div className="instructions">
              <p><strong>Add Mode:</strong> Click to place waypoints</p>
              <p><strong>Connect Mode:</strong> Click two waypoints to connect them</p>
              <p><strong>Select Mode:</strong> Click waypoints to select, drag to move</p>
              <p><strong>Right-click:</strong> Delete waypoint</p>
            </div>
          </div>
        </div>
      </div>

      {waypointContextMenu && (
        <div className="context-menu" style={{ left: waypointContextMenu.x, top: waypointContextMenu.y }}>
          <button onClick={deleteSelectedWaypoint}>Delete Waypoint</button>
        </div>
      )}
    </div>
  );
}