import React, { useState, useEffect } from 'react';
import { withAuthenticator } from 'aws-amplify-react';
import { API, graphqlOperation } from 'aws-amplify';
import { createNote, deleteNote, updateNote } from './graphql/mutations';
import { listNotes } from './graphql/queries';
import {
  onCreateNote,
  onDeleteNote,
  onUpdateNote,
} from './graphql/subscriptions';

function App() {
  const [id, setId] = useState('');
  const [note, setNote] = useState('');
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    // Do mounting stuff here
    getNotes();
    const createNoteListener = API.graphql(
      graphqlOperation(onCreateNote)
    ).subscribe({
      next: noteData => {
        const newNote = noteData.value.data.onCreateNote;
        setNotes(prevNotes => {
          const oldNotes = prevNotes.filter(note => note.id !== newNote.id);
          const updatedNotes = [...oldNotes, newNote];
          return updatedNotes;
        });
      },
    });
    const deleteNoteListener = API.graphql(
      graphqlOperation(onDeleteNote)
    ).subscribe({
      next: noteData => {
        const deletedNote = noteData.value.data.onDeleteNote;
        setNotes(prevNotes => {
          const updatedNotes = prevNotes.filter(
            note => note.id !== deletedNote.id
          );
          return updatedNotes;
        });
      },
    });
    const updateNoteListener = API.graphql(
      graphqlOperation(onUpdateNote)
    ).subscribe({
      next: noteData => {
        const updatedNote = noteData.value.data.onUpdateNote;
        setNotes(prevNotes => {
          const index = prevNotes.findIndex(note => note.id === updatedNote.id);
          const updatedNotes = [
            ...prevNotes.slice(0, index),
            updatedNote,
            ...prevNotes.slice(index + 1),
          ];
          return updatedNotes;
        });
        setId('');
        setNote('');
      },
    });
    return () => {
      // Do unmounting stuff here
      createNoteListener.unsubscribe();
      deleteNoteListener.unsubscribe();
      updateNoteListener.unsubscribe();
    };
  }, []);

  const getNotes = async () => {
    const result = await API.graphql(graphqlOperation(listNotes));
    setNotes(result.data.listNotes.items);
  };

  const handleChangeNote = e => {
    e.target.value === '' && setId('');
    setNote(e.target.value);
  };

  const hasExistingNote = () => {
    if (id) {
      const isNote = notes.findIndex(note => note.id === id) > -1;
      return isNote;
    }
    return false;
  };

  const handleAddNote = async e => {
    e.preventDefault();
    if (hasExistingNote()) {
      handleUpdateNote();
    } else {
      const input = { note };
      await API.graphql(graphqlOperation(createNote, { input }));
      setNote('');
    }
  };

  const handleDeleteNote = async noteId => {
    const input = { id: noteId };
    await API.graphql(graphqlOperation(deleteNote, { input }));
  };

  const handleUpdateNote = async () => {
    const input = { id, note };
    await API.graphql(graphqlOperation(updateNote, { input }));
  };

  const handleSetNote = ({ id, note }) => {
    setId(id);
    setNote(note);
  };

  return (
    <div className='flex flex-column items-center justify-center pa3 bg-washed-red'>
      <h1 className='code f2-1'>Amplify Notetaker</h1>
      <form className='mb-3' onSubmit={handleAddNote}>
        <input
          value={note}
          onChange={handleChangeNote}
          type='text'
          className='pa2 f4'
          placeholder='Write your note'
        />
        <button className='pa2 f4' type='submit'>
          {id !== '' ? 'Edit Note' : 'Add Note'}
        </button>
      </form>

      <div className='pa2'>
        {notes
          ? notes.map(item => (
              <div key={item.id} className='flex item-center'>
                <li onClick={() => handleSetNote(item)} className='list pa1 f3'>
                  {item.note}
                </li>
                <button
                  onClick={() => handleDeleteNote(item.id)}
                  className='bg-transparent bn f4'>
                  <span>&times;</span>
                </button>
              </div>
            ))
          : 'There is no note in the database.'}
      </div>
    </div>
  );
}

export default withAuthenticator(App, { includeGreetings: true });
