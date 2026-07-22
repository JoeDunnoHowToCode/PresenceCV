import React, { KeyboardEvent, useState, useEffect } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import * as LucideIcons from 'lucide-react';
import isEqual from 'fast-deep-equal';
import { TagItem } from '../../types';
import { useDebouncedInput } from './InfoEditor';

interface TagsBlockEditorProps {
  block: any;
  updateBlockTitle: (blockId: string, title: string) => void;
  updateTagItem: (blockId: string, itemId: string, text: string) => void;
  removeTagItem: (blockId: string, itemId: string) => void;
  addTagItem: (blockId: string, text: string) => void;
  isMobile?: boolean;
  reorderTagItems?: (blockId: string, startIndex: number, endIndex: number) => void;
}

const TagsBlockEditor = React.memo(({
  block,
  updateBlockTitle,
  updateTagItem,
  removeTagItem,
  addTagItem,
  isMobile,
  reorderTagItems
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
              <Draggable key={item.id} draggableId={item.id} index={index} isDragDisabled={!!isMobile}>
                {(provided, snapshot) => (
                  <TagItemEditor
                    provided={provided}
                    snapshot={snapshot}
                    blockId={block.id}
                    item={item}
                    index={index}
                    totalItems={block.items.length}
                    updateTagItem={updateTagItem}
                    removeTagItem={removeTagItem}
                    isMobile={isMobile}
                    reorderTagItems={reorderTagItems}
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
  return isEqual(prevProps.block, nextProps.block) && prevProps.isMobile === nextProps.isMobile;
});

interface TagItemEditorProps {
  provided: any;
  snapshot: any;
  blockId: string;
  item: TagItem;
  index: number;
  totalItems: number;
  updateTagItem: (blockId: string, itemId: string, text: string) => void;
  removeTagItem: (blockId: string, itemId: string) => void;
  isMobile?: boolean;
  reorderTagItems?: (blockId: string, startIndex: number, endIndex: number) => void;
}

const TagItemEditor = React.memo(({ provided, snapshot, blockId, item, index, totalItems, updateTagItem, removeTagItem, isMobile, reorderTagItems }: TagItemEditorProps) => {
  const initialParts = item.text.split(':');
  const initialTitle = initialParts[0] || '';
  const initialDesc = initialParts.length > 1 ? initialParts.slice(1).join(':').trim() : '';

  const titleInput = useDebouncedInput(initialTitle, (newTitle) => {
    const currentDesc = descInput.ref.current?.value || '';
    const combined = currentDesc.trim() ? `${newTitle.trim()}: ${currentDesc.trim()}` : newTitle.trim();
    if (combined !== item.text) {
      updateTagItem(blockId, item.id, combined);
    }
  }, 500);

  const descInput = useDebouncedInput(initialDesc, (newDesc) => {
    const currentTitle = titleInput.ref.current?.value || '';
    const combined = newDesc.trim() ? `${currentTitle.trim()}: ${newDesc.trim()}` : currentTitle.trim();
    if (combined !== item.text) {
      updateTagItem(blockId, item.id, combined);
    }
  }, 500);

  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => {
    if (isConfirmingDelete) {
      const timer = setTimeout(() => setIsConfirmingDelete(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isConfirmingDelete]);

  return (
    <div 
      ref={provided.innerRef}
      {...provided.draggableProps}
      className={`bg-white border border-[#eceae4] shadow-sm p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center gap-4 ${snapshot.isDragging ? 'z-50 shadow-2xl' : ''}  group`}
    >
      {isMobile ? (
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => reorderTagItems?.(blockId, index, index - 1)}
            className="p-1 text-[#5f5f5d] disabled:opacity-20 hover:text-accent transition-colors"
            title="Move Up"
          >
            <LucideIcons.ChevronUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={index === totalItems - 1}
            onClick={() => reorderTagItems?.(blockId, index, index + 1)}
            className="p-1 text-[#5f5f5d] disabled:opacity-20 hover:text-accent transition-colors"
            title="Move Down"
          >
            <LucideIcons.ChevronDown className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div 
          {...provided.dragHandleProps}
          className="cursor-grab active:cursor-grabbing text-[#eceae4] hover:text-accent transition-colors mt-1 md:mt-0"
        >
          <LucideIcons.GripVertical className="w-5 h-5" />
        </div>
      )}
      
      <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4 w-full">
        <input
          ref={titleInput.ref as React.Ref<HTMLInputElement>}
          defaultValue={titleInput.defaultValue}
          onChange={titleInput.onChange}
          onBlur={titleInput.onBlur}
          placeholder="Category (e.g., Programming)"
          className="bg-transparent border-b border-[#eceae4] hover:border-[#1c1c1c]/20 focus:border-accent outline-none text-base font-medium tracking-wide text-[#1c1c1c] transition-colors pb-1 w-full"
        />
        <input
          ref={descInput.ref as React.Ref<HTMLInputElement>}
          defaultValue={descInput.defaultValue}
          onChange={descInput.onChange}
          onBlur={descInput.onBlur}
          placeholder="Skills (e.g., Python, JS, React)"
          className="bg-transparent border-b border-[#eceae4] hover:border-[#1c1c1c]/20 focus:border-accent outline-none text-base tracking-wide text-[#5f5f5d] transition-colors pb-1 w-full"
        />
      </div>

      {isConfirmingDelete ? (
        <button
          onClick={() => {
            removeTagItem(blockId, item.id);
            setIsConfirmingDelete(false);
          }}
          className="px-2.5 py-1 bg-red-500 text-white text-xs rounded-lg font-medium hover:bg-red-600 transition-all self-end md:self-center shrink-0 shadow-sm mt-1 md:mt-0"
        >
          Confirm?
        </button>
      ) : (
        <button 
          onClick={() => setIsConfirmingDelete(true)} 
          className="text-[#5f5f5d] hover:text-red-400 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all mt-1 md:mt-0"
          title="Delete Tag"
        >
          <LucideIcons.X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return isEqual(prevProps.item, nextProps.item) &&
         prevProps.index === nextProps.index &&
         prevProps.totalItems === nextProps.totalItems &&
         prevProps.isMobile === nextProps.isMobile &&
         prevProps.snapshot.isDragging === nextProps.snapshot.isDragging;
});

export default TagsBlockEditor;
