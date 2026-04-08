/**
 * @clawgame/web - Asset Filter Panel
 * Search, filter, and upload controls for the asset studio sidebar.
 */

import React from 'react';
import { Upload, Filter, Search, X } from 'lucide-react';
import type { AssetType } from '../../api/client';

interface FilterPanelProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filter: AssetType | '';
  onFilterChange: (filter: AssetType | '') => void;
  onUploadClick: () => void;
  assetTypes: AssetType[];
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  searchQuery,
  onSearchChange,
  filter,
  onFilterChange,
  onUploadClick,
  assetTypes,
}) => {
  return (
    <>
      {/* Upload Section */}
      <div className="studio-panel">
        <div className="panel-header">
          <Upload size={18} className="panel-icon" />
          <h2>Upload Asset</h2>
        </div>
        <p className="upload-hint">Upload existing assets from your computer</p>
        <button onClick={onUploadClick} className="upload-button secondary">
          <Upload size={18} />
          Upload File
        </button>
      </div>

      {/* Filters */}
      <div className="studio-panel">
        <div className="panel-header">
          <Filter size={18} className="panel-icon" />
          <h2>Filter Assets</h2>
        </div>
        <div className="filter-controls">
          <div className="search-box">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            {searchQuery && (
              <button onClick={() => onSearchChange('')} className="clear-search">
                <X size={14} />
              </button>
            )}
          </div>

          <select
            value={filter}
            onChange={(e) => onFilterChange(e.target.value as AssetType | '')}
            className="type-filter"
          >
            <option value="">All Types</option>
            {assetTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
};
