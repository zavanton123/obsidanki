
import os
import re
import pytest
from anki.errors import NotFoundError  # noqa
from anki.collection import Collection
from anki.collection import SearchNode

col_path = 'tests/test_outputs/inline_notes/Anki2/User 1/collection.anki2'
test_file_path = 'tests/test_outputs/inline_notes/Obsidian/inline_notes/inline_notes.md'

@pytest.fixture()
def col():
    if not os.path.isfile(col_path):
        pytest.skip(f"e2e output not found: {col_path} (run test-wdio first)")
    col = Collection(col_path)
    yield col
    col.close()

def test_col_exists(col):
    assert not col.is_empty()

def test_deck_default_exists(col: Collection):
    assert col.decks.id_for_name('Default') is not None

def test_cards_count(col: Collection):
    assert len(col.find_cards( col.build_search_string(SearchNode(deck='Default')) )) == 1

def test_cards_ids_from_obsidian(col: Collection):
    obsidian_test_md = test_file_path
    obs_IDs = []
    with open(obsidian_test_md) as file:
        content = file.read()
    # Body IDs (legacy)
    for m in re.finditer(r'\n?(?:<!--)?(?:ID: (\d+).*)', content):
        obs_IDs.append(m.group(1))
    # Frontmatter anki-id (current plugin)
    fm_match = re.search(r'^---\s*\n(.*?)\n---', content, re.DOTALL)
    if fm_match:
        for m in re.finditer(r'anki-id:\s*(\d+)', fm_match.group(1)):
            obs_IDs.append(m.group(1))

    anki_IDs = col.find_notes(col.build_search_string(SearchNode(deck='Default')))
    assert len(anki_IDs) == len(obs_IDs)
    for aid, oid in zip(anki_IDs, obs_IDs):
        assert str(aid) == oid
    
def test_cards_front_back_tag_type(col: Collection):

    anki_IDs = col.find_notes( col.build_search_string(SearchNode(deck='Default')) )
    
    note1 = col.get_note(anki_IDs[0])
    assert note1.fields[0] == "This is a test."
    assert note1.fields[1] == "Test successful!"

    assert note1.note_type()["name"] == "Basic"