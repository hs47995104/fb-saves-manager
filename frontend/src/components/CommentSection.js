import React, { useState, useEffect } from 'react';
import { FiMessageSquare, FiX, FiEdit2, FiTrash2, FiCheck, FiClock } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { addComment, updateComment, deleteComment, getItemComments } from '../api';
import './Styles.css';

const CommentSection = ({ collectionId, saveIndex, onUpdate, onCommentAdded, onCommentDeleted }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editText, setEditText] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (expanded) {
      loadComments();
    }
  }, [expanded, collectionId, saveIndex]);

  const loadComments = async () => {
    try {
      const response = await getItemComments(collectionId, saveIndex);
      setComments(response.data.comments || []);
    } catch (error) {
      console.error('Failed to load comments:', error);
      toast.error('Failed to load comments');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    if (newComment.length > 1000) {
      toast.error('Comment is too long (maximum 1000 characters)');
      return;
    }

    setLoading(true);
    try {
      await addComment(collectionId, saveIndex, newComment.trim());
      toast.success('Comment added');
      setNewComment('');
      await loadComments();
      
      if (onUpdate) {
        await onUpdate();
      }
      
      if (onCommentAdded) {
        onCommentAdded();
      }
    } catch (error) {
      toast.error(error.message || 'Failed to add comment');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateComment = async (commentIndex) => {
    if (!editText.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    setLoading(true);
    try {
      await updateComment(collectionId, saveIndex, commentIndex, editText.trim());
      toast.success('Comment updated');
      setEditingIndex(null);
      setEditText('');
      await loadComments();
      
      if (onUpdate) {
        await onUpdate();
      }
    } catch (error) {
      toast.error(error.message || 'Failed to update comment');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentIndex) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    setLoading(true);
    try {
      await deleteComment(collectionId, saveIndex, commentIndex);
      toast.success('Comment deleted');
      await loadComments();
      
      if (onUpdate) {
        await onUpdate();
      }
      
      if (onCommentDeleted) {
        onCommentDeleted();
      }
    } catch (error) {
      toast.error(error.message || 'Failed to delete comment');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
      
      return date.toLocaleDateString();
    } catch (e) {
      return 'Unknown date';
    }
  };

  return (
    <div className="comment-section">
      <button
        className="comment-toggle"
        onClick={() => setExpanded(!expanded)}
      >
        <FiMessageSquare />
        <span>Comments ({comments.length})</span>
      </button>

      {expanded && (
        <div className="comments-container">
          <div className="comments-list">
            {comments.length === 0 ? (
              <div className="no-comments">
                <p>No comments yet. Be the first to comment!</p>
              </div>
            ) : (
              comments.map((comment, index) => (
                <div key={index} className="comment-item">
                  {editingIndex === index ? (
                    <div className="comment-edit">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="comment-edit-input"
                        autoFocus
                        disabled={loading}
                        maxLength={1000}
                      />
                      <div className="comment-edit-actions">
                        <button
                          className="save-edit-btn"
                          onClick={() => handleUpdateComment(index)}
                          disabled={loading || !editText.trim()}
                        >
                          <FiCheck /> Save
                        </button>
                        <button
                          className="cancel-edit-btn"
                          onClick={() => {
                            setEditingIndex(null);
                            setEditText('');
                          }}
                          disabled={loading}
                        >
                          <FiX /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="comment-content">
                        <p>{comment.text}</p>
                        <div className="comment-meta">
                          <FiClock size={12} />
                          <span>{formatDate(comment.createdAt)}</span>
                          {comment.updatedAt && comment.updatedAt !== comment.createdAt && (
                            <span className="edited">(edited)</span>
                          )}
                        </div>
                      </div>
                      <div className="comment-actions">
                        <button
                          className="comment-action-btn"
                          onClick={() => {
                            setEditingIndex(index);
                            setEditText(comment.text);
                          }}
                          disabled={loading}
                          title="Edit comment"
                        >
                          <FiEdit2 size={14} />
                        </button>
                        <button
                          className="comment-action-btn delete"
                          onClick={() => handleDeleteComment(index)}
                          disabled={loading}
                          title="Delete comment"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="add-comment">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="comment-input"
              disabled={loading}
              maxLength={1000}
              rows="3"
            />
            <div className="add-comment-footer">
              <span className="char-count">
                {newComment.length}/1000
              </span>
              <button
                className="add-comment-btn"
                onClick={handleAddComment}
                disabled={loading || !newComment.trim()}
              >
                Add Comment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommentSection;