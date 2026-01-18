"use client"

import { useState } from "react"
import { Copy, Trash2, Edit2, FolderOpen } from "lucide-react"
import { toast } from "sonner"
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "../../../../components/ui/context-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../../components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../../components/ui/dialog"
import { Button } from "../../../../components/ui/button"
import { Input } from "../../../../components/ui/input"
import { trpc } from "../../../../lib/trpc"
import { join, basename, dirname } from "../../../../lib/utils/path"

interface FileTreeContextMenuProps {
  /** Relative path from project root */
  path: string
  /** File or folder */
  type: "file" | "folder"
  /** Absolute path to project root */
  projectPath: string
  /** Callback after successful delete */
  onDeleted?: () => void
  /** Callback after successful rename */
  onRenamed?: () => void
}

export function FileTreeContextMenu({
  path,
  type,
  projectPath,
  onDeleted,
  onRenamed,
}: FileTreeContextMenuProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [newName, setNewName] = useState(basename(path))
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)

  const absolutePath = join(projectPath, path)
  const fileName = basename(path)
  const parentDir = dirname(path)

  // tRPC mutations
  const deleteFileMutation = trpc.files.deleteFile.useMutation()
  const renameFileMutation = trpc.files.renameFile.useMutation()
  const revealMutation = trpc.files.revealInFileManager.useMutation()

  // Copy absolute path to clipboard
  const handleCopyPath = async () => {
    try {
      await window.desktopApi.clipboardWrite(absolutePath)
      toast.success("Path copied to clipboard")
    } catch {
      toast.error("Failed to copy path")
    }
  }

  // Copy relative path to clipboard
  const handleCopyRelativePath = async () => {
    try {
      await window.desktopApi.clipboardWrite(path)
      toast.success("Relative path copied to clipboard")
    } catch {
      toast.error("Failed to copy path")
    }
  }

  // Copy just the file/folder name to clipboard
  const handleCopyName = async () => {
    try {
      await window.desktopApi.clipboardWrite(fileName)
      toast.success("Name copied to clipboard")
    } catch {
      toast.error("Failed to copy name")
    }
  }

  // Delete file or folder
  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteFileMutation.mutateAsync({ filePath: absolutePath })
      toast.success(`${type === "folder" ? "Folder" : "File"} deleted`)
      setShowDeleteDialog(false)
      onDeleted?.()
    } catch (error) {
      toast.error(`Failed to delete ${type}`)
    } finally {
      setIsDeleting(false)
    }
  }

  // Rename file or folder
  const handleRename = async () => {
    if (!newName.trim() || newName === fileName) {
      setShowRenameDialog(false)
      return
    }

    setIsRenaming(true)
    try {
      const newPath = parentDir === "." ? newName : join(projectPath, parentDir, newName)
      await renameFileMutation.mutateAsync({
        oldPath: absolutePath,
        newPath,
      })
      toast.success(`${type === "folder" ? "Folder" : "File"} renamed`)
      setShowRenameDialog(false)
      onRenamed?.()
    } catch (error) {
      toast.error(`Failed to rename ${type}`)
    } finally {
      setIsRenaming(false)
    }
  }

  // Reveal in Finder/Explorer
  const handleRevealInFinder = async () => {
    try {
      await revealMutation.mutateAsync({ filePath: absolutePath })
    } catch {
      toast.error("Failed to reveal in file manager")
    }
  }

  return (
    <>
      <ContextMenuContent className="w-52">
        {/* Copy actions */}
        <ContextMenuItem onClick={handleCopyPath}>
          <Copy className="mr-2 h-4 w-4" />
          Copy Path
        </ContextMenuItem>
        <ContextMenuItem onClick={handleCopyRelativePath}>
          <Copy className="mr-2 h-4 w-4" />
          Copy Relative Path
        </ContextMenuItem>
        {type === "file" && (
          <ContextMenuItem onClick={handleCopyName}>
            <Copy className="mr-2 h-4 w-4" />
            Copy File Name
          </ContextMenuItem>
        )}

        <ContextMenuSeparator />

        {/* Edit actions */}
        <ContextMenuItem onClick={() => {
          setNewName(fileName)
          setShowRenameDialog(true)
        }}>
          <Edit2 className="mr-2 h-4 w-4" />
          Rename...
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => setShowDeleteDialog(true)}
          className="text-red-500 focus:text-red-500"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/* System actions */}
        <ContextMenuItem onClick={handleRevealInFinder}>
          <FolderOpen className="mr-2 h-4 w-4" />
          Reveal in Finder
        </ContextMenuItem>
      </ContextMenuContent>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {type === "folder" ? "folder" : "file"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{fileName}</strong>?
              {type === "folder" && " This will delete all contents inside."}
              {" "}This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Rename {type === "folder" ? "folder" : "file"}
            </DialogTitle>
            <DialogDescription>
              Enter a new name for <strong>{fileName}</strong>
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New name"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                handleRename()
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)} disabled={isRenaming}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={isRenaming || !newName.trim()}>
              {isRenaming ? "Renaming..." : "Rename"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
