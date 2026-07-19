import React, { KeyboardEvent, useState } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import * as LucideIcons from 'lucide-react';
import isEqual from 'fast-deep-equal';
import { TagItem } from '../../types';
import { useDebouncedInput } from './InfoEditor';
import { useEffect } from 'react';

interface TagsBlockEditorProps {
  block: any;
  updateBlockTitle: (blockId: string, title: string) => void;
  updateTagItem: (blockId: string, itemId: string, text: string) => void;
  removeTagItem: (blockId: string, itemId: string) => void;
  addTagItem: (blockId: string, text: string) => void;
}

const TagsBlockEditor = React.memo(({
  block,
  updateBlockTitle,
  updateTagItem,
  removeTagItem,
  addTagItem
}: TagsBlockEditorProps) => {

  const titleInput = useDebouncedInput(block.title, (val) => updateBlockTitle(block.id, val));
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const handleAddTag = () => {
    if (newTitle.trim() || newDesc.trim()) {
      const combined = newDesc.trim() ? `${newTitle.trim()}: ${newDesc.trim()}` : newTitle.trim();
      addTagItem(block.id, combined);
      setNewTitle('');
      setNewDesc('');
    }
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddTag();
    }
  };

  return (
    <div className="py-8">
      <div className="flex items-center justify-between mb-12">
        <input
          ref={titleInput.ref as React.Ref<HTMLInputElement>}
          defaultValue={titleInput.defaultValue}
          onChange={titleInput.onChange}
          onBlur={titleInput.onBlur}
          className="bg-transparent border-b border-transparent hover:border-[#eceae4] focus:border-accent outline-none text-sm font-bold uppercase tracking-[0.2em] text-[#5f5f5d] pb-1 transition-colors "
          placeholder="Section Title"
        />
      </div>

      <Droppable droppableId={block.id} type="tag-items">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
            {block.items.map((item: TagItem, index: number) => (
              // @ts-expect-error hello-pangea/dnd types don't officially include key but React requires it
              <Draggable key={item.id} draggableId={item.id} index={index}>
                {(provided, snapshot) => (
                  <TagItemEditor
                    provided={provided}
                    snapshot={snapshot}
                    blockId={block.id}
                    item={item}
                    updateTagItem={updateTagItem}
                    removeTagItem={removeTagItem}
                  />
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      <div className="bg-white/50 border border-[#eceae4] p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center gap-4 mt-4">
        <LucideIcons.Plus className="w-5 h-5 text-[#5f5f5d] opacity-50 mt-1 md:mt-0" />
        <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4 w-full">
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="Category (e.g., Tools)"
            className="bg-transparent border-b border-[#eceae4] focus:border-accent outline-none text-sm tracking-wide px-1 pb-1 transition-colors text-[#5f5f5d] w-full"
          />
          <input
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="Skills (e.g., Git, Docker) (Press Enter)"
            className="bg-transparent border-b border-[#eceae4] focus:border-accent outline-none text-sm tracking-wide px-1 pb-1 transition-colors text-[#5f5f5d] w-full"
          />
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return isEqual(prevProps.block, nextProps.block);
});

interface TagItemEditorProps {
  provided: any;
  snapshot: any;
  blockId: string;
  item: TagItem;
  updateTagItem: (blockId: string, itemId: string, text: string) => void;
  removeTagItem: (blockId: string, itemId: string) => void;
}

const TagItemEditor = React.memo(({ provided, snapshot, blockId, item, updateTagItem, removeTagItem }: TagItemEditorProps) => {
  const initialParts = item.text.split(':');
  const initialTitle = initialParts[0] || '';
  const initialDesc = initialParts.length > 1 ? initialParts.slice(1).join(':').trim() : '';

  const [title, setTitle] = useState(initialTitle);
  const [desc, setDesc] = useState(initialDesc);

  useEffect(() => {
    const handler = setTimeout(() => {
      const combined = desc.trim() ? `${title.trim()}: ${desc.trim()}` : title.trim();
      if (combined !== item.text) {
        updateTagItem(blockId, item.id, combined);
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [title, desc, blockId, item.id, item.text, updateTagItem]);

  return (
    <div 
      ref={provided.innerRef}
      {...provided.draggableProps}
      className={`bg-white border border-[#eceae4] shadow-sm p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center gap-4 ${snapshot.isDragging ? 'z-50 shadow-2xl' : ''}  group`}
    >
      <div 
        {...provided.dragHandleProps}
        className="cursor-grab active:cursor-grabbing text-[#eceae4] hover:text-accent transition-colors mt-1 md:mt-0"
      >
        <LucideIcons.GripVertical className="w-5 h-5" />
      </div>
      
      <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4 w-full">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Category (e.g., Programming)"
          className="bg-transparent border-b border-[#eceae4] hover:border-[#1c1c1c]/20 focus:border-accent outline-none text-base font-medium tracking-wide text-[#1c1c1c] transition-colors pb-1 w-full"
        />
        <input
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Skills (e.g., Python, JS, React)"
          className="bg-transparent border-b border-[#eceae4] hover:border-[#1c1c1c]/20 focus:border-accent outline-none text-base tracking-wide text-[#5f5f5d] transition-colors pb-1 w-full"
        />
      </div>

      <button 
        onClick={() => removeTagItem(blockId, item.id)} 
        className="text-[#5f5f5d] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all mt-1 md:mt-0"
      >
        <LucideIcons.X className="w-4 h-4" />
      </button>
    </div>
  );
}, (prevProps, nextProps) => {
  return isEqual(prevProps.item, nextProps.item) &&
         prevProps.snapshot.isDragging === nextProps.snapshot.isDragging;
});

export default TagsBlockEditor;
