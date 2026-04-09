import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import '../file-tree.css';
import { logger } from '../utils/logger';

interface FileTreeProps {
  projectId: string;
  currentPath?: string;
  onFileSelect?: (filePath: string) => void;
  selectedFile?: string;
  className?: string;
}

interface TreeNodeProps {
  node: any;
  level: number;
  projectId: string;
  selectedFile?: string;
  onFileSelect?: (filePath: string) => void;
}

function TreeNode({ node, level, projectId, selectedFile, onFileSelect }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [children, setChildren] = useState<any[]>([]);

  const hasChildren = node.type === 'directory';
  const isSelected = selectedFile === node.path;
  const indent = level * 20;

  const toggleExpand = async () => {
    if (node.type !== 'directory') return;

    if (isExpanded) {
      setIsExpanded(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.getFileTree(projectId, node.path, 1);
      setChildren(response);
      setIsExpanded(true);
    } catch (err) {
      logger.error('Failed to load directory:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('[FileTree] handleSelect:', { nodeType: node.type, nodePath: node.path, nodeName: node.name });
    
    if (node.type === 'file') {
      console.log('[FileTree] Calling onFileSelect with:', node.path);
      onFileSelect?.(node.path);
    } else {
      toggleExpand();
    }
  };

  const handleIconClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleExpand();
  };

  return (
    <div>
      <div
        className={`tree-node ${isSelected ? 'selected' : ''}`}
        style={{ paddingLeft: `${indent}px` }}
        onClick={handleSelect}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleSelect(e as any);
          }
        }}
      >
        <div className="node-content">
          {node.type === 'directory' ? (
            <span className="toggle-icon" onClick={handleIconClick} role="button" tabIndex={0}>
              {isExpanded ? '📂' : isLoading ? '📁' : '📁'}
            </span>
          ) : (
            <span className="file-icon">
              {node.extension === '.ts' || node.extension === '.tsx' || node.extension === '.js' || node.extension === '.jsx' ? '📄' :
               node.extension === '.json' ? '📄' :
               node.extension === '.css' ? '🎨' :
               node.extension === '.md' ? '📝' :
               node.extension === '.png' || node.extension === '.jpg' || node.extension === '.webp' ? '🖼️' :
               '📄'}
            </span>
          )}
          <span className="node-name">{node.name}</span>
        </div>
      </div>
      
      {isExpanded && hasChildren && (
        <div className="tree-children">
          {children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              level={level + 1}
              projectId={projectId}
              selectedFile={selectedFile}
              onFileSelect={onFileSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileTree({ projectId, currentPath = '', onFileSelect, selectedFile, className }: FileTreeProps) {
  const [fileTree, setFileTree] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFileTree();
  }, [projectId, currentPath]);

  const loadFileTree = async () => {
    setIsLoading(true);
    try {
      const response = await api.getFileTree(projectId, currentPath, 3);
      setFileTree(response);
    } catch (err) {
      logger.error('Failed to load file tree:', err);
      setFileTree([]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className={`file-tree ${className}`}>Loading file tree...</div>;
  }

  return (
    <div className={`file-tree ${className}`}>
      <div className="tree-header">
        <h3>File Explorer</h3>
        <button onClick={loadFileTree} className="refresh-btn" type="button">🔄</button>
      </div>
      
      <div className="tree-content">
        {fileTree.length === 0 ? (
          <div className="empty-tree">
            <p>No files found</p>
          </div>
        ) : (
          fileTree.map((node) => (
            <TreeNode
              key={node.path}
              node={node}
              level={0}
              projectId={projectId}
              selectedFile={selectedFile}
              onFileSelect={onFileSelect}
            />
          ))
        )}
      </div>
    </div>
  );
}
