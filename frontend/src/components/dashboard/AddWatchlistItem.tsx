import { useState } from 'react';
import { addWatchlistItem } from '../../services/api';
import toast from 'react-hot-toast';

interface AddWatchlistItemProps {
  onAdd: () => void;
}

const AddWatchlistItem = ({ onAdd }: AddWatchlistItemProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pattern, setPattern] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('medium');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newItem = await addWatchlistItem({
        pattern,
        description,
        severity,
      });
      toast.success(`Added "${newItem.pattern}" to watchlist`);
      onAdd();
      setIsOpen(false);
      setPattern('');
      setDescription('');
      setSeverity('medium');
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      toast.error('Failed to add to watchlist');
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors"
      >
        + Add new watchlist item
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Pattern (host or IP)
        </label>
        <input
          type="text"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          required
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="e.g., example.com or 192.168.1.1"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Why are you watching this target?"
          rows={3}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Severity
        </label>
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Add to Watchlist
        </button>
      </div>
    </form>
  );
};

export default AddWatchlistItem;