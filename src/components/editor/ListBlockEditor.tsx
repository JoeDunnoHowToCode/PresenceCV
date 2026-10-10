import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import * as LucideIcons from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import isEqual from 'fast-deep-equal';
import { ListItem } from '../../types';
import { useDebouncedInput } from './InfoEditor';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { migrateLegacyTextToHtml } from '../../utils/htmlSanitizer';

interface ListBlockEditorProps {
  block: any;
  updateBlockTitle: (blockId: string, title: string) => void;
  updateListItem: (blockId: string, itemId: string, field: keyof ListItem, value: string) => void;
  removeListItem: (blockId: string, itemId: string) => void;
  addListItem: (blockId: string) => void;
  isMobile?: boolean;
  reorderListItems?: (blockId: string, startIndex: number, endIndex: number) => void;
}

const ListBlockEditor = React.memo(({
  block,
  updateBlockTitle,
  updateListItem,
  removeListItem,
  addListItem,
  isMobile,
  reorderListItems
}: ListBlockEditorProps) => {
  const { t } = useTranslation();
  const titleInput = useDebouncedInput(block.title, (val) => updateBlockTitle(block.id, val));

  return (
    <div className="py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-12">
        <div className="flex flex-wrap items-center gap-4">
          <input
            ref={titleInput.ref as React.Ref<HTMLInputElement>}
            defaultValue={titleInput.defaultValue}
            onChange={titleInput.onChange}
            onBlur={titleInput.onBlur}
            className="bg-transparent border-b border-transparent hover:border-[#eceae4] focus:border-accent outline-none text-sm font-bold tracking-[0.2em] text-[#5f5f5d] pb-1 transition-colors "
            placeholder={t('editor.listBlock.titlePlaceholder')}
          />
          {block.items.length > 4 && (
            <div className="flex items-center gap-1.5 text-yellow-400 text-xs bg-yellow-400/10 px-3 py-1 rounded-full border border-yellow-400/20">
              <LucideIcons.AlertTriangle className="w-3 h-3" />
              <p className="text-xs text-[#5f5f5d]">
              {t('editor.listBlock.maxItemsWarning')}
            </p>
            </div>
          )}
        </div>
      </div>

      <Droppable droppableId={block.id} type="list-items">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef}>
            {block.items.map((item: ListItem, index: number) => (
              // @ts-expect-error hello-pangea/dnd types don't officially include key but React requires it
              <Draggable key={item.id} draggableId={item.id} index={index} isDragDisabled={!!isMobile}>
                {(provided, snapshot) => (
                  <ListItemEditor
                    provided={provided}
                    snapshot={snapshot}
                    blockId={block.id}
                    item={item}
                    index={index}
                    totalItems={block.items.length}
                    updateListItem={updateListItem}
                    removeListItem={removeListItem}
                    isMobile={isMobile}
                    reorderListItems={reorderListItems}
                  />
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      <button
        onClick={() => addListItem(block.id)}
        className="w-full bg-white/50 border border-[#eceae4] py-4 rounded-2xl flex items-center justify-center gap-2 text-[#5f5f5d] hover:text-accent hover:bg-white transition-all shadow-sm mt-6"
      >
        <LucideIcons.Plus className="w-4 h-4" />
        <span className="text-xs tracking-widest">{t('editor.listBlock.addItem')}</span>
      </button>
    </div>
  );
}, (prevProps, nextProps) => {
  return isEqual(prevProps.block, nextProps.block) && prevProps.isMobile === nextProps.isMobile;
});

interface ListItemEditorProps {
  provided: any;
  snapshot: any;
  blockId: string;
  item: ListItem;
  index: number;
  totalItems: number;
  updateListItem: (blockId: string, itemId: string, field: keyof ListItem, value: string) => void;
  removeListItem: (blockId: string, itemId: string) => void;
  isMobile?: boolean;
  reorderListItems?: (blockId: string, startIndex: number, endIndex: number) => void;
}

const ListItemEditor = React.memo(({ provided, snapshot, blockId, item, index, totalItems, updateListItem, removeListItem, isMobile, reorderListItems }: ListItemEditorProps) => {
  const { t } = useTranslation();
  const titleInput = useDebouncedInput(item.title, (val) => updateListItem(blockId, item.id, 'title', val));
  const subtitleInput = useDebouncedInput(item.subtitle, (val) => updateListItem(blockId, item.id, 'subtitle', val));
  const periodInput = useDebouncedInput(item.period, (val) => updateListItem(blockId, item.id, 'period', val));

  const [isFocused, setIsFocused] = useState(false);
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          HTMLAttributes: {
            class: 'list-disc space-y-1 marker:text-[#1c1c1c]',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'list-decimal space-y-1 marker:text-[#1c1c1c]',
          },
        },
      }),
      Placeholder.configure({
        placeholder: t('editor.listBlock.descriptionPlaceholder'),
      }),
    ],
    content: migrateLegacyTextToHtml(item.description || ''),
    onUpdate: ({ editor }) => {
      updateListItem(blockId, item.id, 'description', editor.getHTML());
    },
    onFocus: () => setIsFocused(true),
    onBlur: () => setTimeout(() => setIsFocused(false), 200),
  });

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
      className={`bg-white border border-[#eceae4] shadow-sm p-6 rounded-2xl space-y-4 relative group mb-6 ${snapshot.isDragging ? 'z-50 shadow-2xl' : ''}`}
    >
      {isMobile ? (
        <div className="absolute left-2 top-4 flex flex-col gap-1 z-10">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => reorderListItems?.(blockId, index, index - 1)}
            className="p-1 text-[#5f5f5d] disabled:opacity-20 hover:text-accent transition-colors"
            title="Move Up"
          >
            <LucideIcons.ChevronUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={index === totalItems - 1}
            onClick={() => reorderListItems?.(blockId, index, index + 1)}
            className="p-1 text-[#5f5f5d] disabled:opacity-20 hover:text-accent transition-colors"
            title="Move Down"
          >
            <LucideIcons.ChevronDown className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div 
          {...provided.dragHandleProps}
          aria-label={item.title ? t('editor.a11y.reorderItem', { title: item.title }) : t('editor.a11y.reorderUntitledItem')}
          className="absolute left-4 top-4 text-[#eceae4] hover:text-accent cursor-grab active:cursor-grabbing transition-colors"
        >
          <LucideIcons.GripVertical className="w-5 h-5" />
        </div>
      )}

      {isConfirmingDelete ? (
        <button 
          onClick={() => {
            removeListItem(blockId, item.id);
            setIsConfirmingDelete(false);
          }}
          className="absolute top-4 right-4 px-2.5 py-1 bg-red-500 text-white text-xs rounded-lg font-medium hover:bg-red-600 transition-all z-10 shadow-sm"
        >
          {t('common.confirm')}
        </button>
      ) : (
        <button 
          onClick={() => setIsConfirmingDelete(true)} 
          className="absolute top-4 right-4 text-[#5f5f5d] hover:text-red-400 transition-colors z-10"
          title="Delete Item"
        >
          <LucideIcons.X className="w-4 h-4" />
        </button>
      )}
      <div className="pl-8">
        <input
          ref={titleInput.ref as React.Ref<HTMLInputElement>}
          defaultValue={titleInput.defaultValue}
          onChange={titleInput.onChange}
          onBlur={titleInput.onBlur}
          className="w-full bg-transparent border-b border-[#eceae4] focus:border-accent outline-none text-2xl pb-1 text-[#1c1c1c] transition-colors "
          placeholder={t('editor.listBlock.roleTitlePlaceholder')}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <input
            ref={subtitleInput.ref as React.Ref<HTMLInputElement>}
            defaultValue={subtitleInput.defaultValue}
            onChange={subtitleInput.onChange}
            onBlur={subtitleInput.onBlur}
            className="w-full bg-transparent border-b border-[#eceae4] focus:border-accent outline-none text-xs tracking-widest pb-1 text-[#5f5f5d] transition-colors "
            placeholder={t('editor.listBlock.subtitlePlaceholder')}
          />
          <input
            ref={periodInput.ref as React.Ref<HTMLInputElement>}
            defaultValue={periodInput.defaultValue}
            onChange={periodInput.onChange}
            onBlur={periodInput.onBlur}
            className="w-full bg-transparent border-b border-[#eceae4] focus:border-accent outline-none text-xs tracking-widest pb-1 text-[#5f5f5d] transition-colors "
            placeholder={t('editor.listBlock.dateRangePlaceholder')}
          />
        </div>
        <div className="relative mt-4 w-full">
          <AnimatePresence>
            {isFocused && editor && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                transition={{ duration: 0.15 }}
                className="absolute -top-10 right-0 z-20 flex items-center gap-1 bg-white/90 backdrop-blur-md border border-[#eceae4] p-1 rounded-xl shadow-md"
              >
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    editor?.chain().focus().toggleBold().run();
                  }}
                  className={`p-1.5 rounded-lg transition-colors ${editor?.isActive('bold') ? 'bg-black/10 text-[#1c1c1c]' : 'text-[#5f5f5d] hover:text-[#1c1c1c] hover:bg-black/5'}`}
                  title="Bold"
                >
                  <LucideIcons.Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    editor?.chain().focus().toggleItalic().run();
                  }}
                  className={`p-1.5 rounded-lg transition-colors ${editor?.isActive('italic') ? 'bg-black/10 text-[#1c1c1c]' : 'text-[#5f5f5d] hover:text-[#1c1c1c] hover:bg-black/5'}`}
                  title="Italic"
                >
                  <LucideIcons.Italic className="w-3.5 h-3.5" />
                </button>
                <div className="w-px h-4 bg-[#eceae4] mx-0.5" />
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    editor?.chain().focus().toggleOrderedList().run();
                  }}
                  className={`p-1.5 rounded-lg transition-colors ${editor?.isActive('orderedList') ? 'bg-black/10 text-[#1c1c1c]' : 'text-[#5f5f5d] hover:text-[#1c1c1c] hover:bg-black/5'}`}
                  title="Numbered List"
                >
                  <LucideIcons.ListOrdered className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    editor?.chain().focus().toggleBulletList().run();
                  }}
                  className={`p-1.5 rounded-lg transition-colors ${editor?.isActive('bulletList') ? 'bg-black/10 text-[#1c1c1c]' : 'text-[#5f5f5d] hover:text-[#1c1c1c] hover:bg-black/5'}`}
                  title="Bullet List"
                >
                  <LucideIcons.List className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="w-full bg-[#f9f8f5] border border-[#eceae4] text-[#1c1c1c] rounded-xl p-4 text-sm focus-within:border-accent/50 outline-none transition-colors overflow-hidden">
            <EditorContent editor={editor} className="prose prose-sm max-w-none focus:outline-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-ul:pl-5 prose-ol:pl-5" />
          </div>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return isEqual(prevProps.item, nextProps.item) &&
         prevProps.index === nextProps.index &&
         prevProps.totalItems === nextProps.totalItems &&
         prevProps.isMobile === nextProps.isMobile &&
         prevProps.snapshot.isDragging === nextProps.snapshot.isDragging &&
         prevProps.snapshot.isDropAnimating === nextProps.snapshot.isDropAnimating &&
         isEqual(prevProps.provided.draggableProps.style, nextProps.provided.draggableProps.style);
});

export default ListBlockEditor;
