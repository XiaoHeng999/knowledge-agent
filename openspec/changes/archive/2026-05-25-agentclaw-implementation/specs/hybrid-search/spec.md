## ADDED Requirements

### Requirement: Vector Indexing with SQLite-vec
The system SHALL maintain a vector index of all knowledge node embeddings using SQLite-vec. The index SHALL be updated automatically whenever a knowledge node is created or updated. The vector dimension SHALL be 1536 (OpenAI text-embedding-ada-002 compatible). The index SHALL support incremental updates without full rebuilds.

#### Scenario: Indexing a new knowledge node
- **WHEN** a knowledge node is created with text content "The attention mechanism enables dynamic weight assignment"
- **THEN** the text is embedded using the configured embedding model, and the resulting 1536-dimension vector is inserted into the `vss_nodes` table linked to the node's ID

#### Scenario: Updating an existing vector
- **WHEN** a knowledge node's content is modified
- **THEN** the old vector is deleted from `vss_nodes`, the new content is embedded, and the new vector is inserted with the same node ID

### Requirement: BM25 Full-Text Search
The system SHALL maintain an FTS5 virtual table for full-text search over knowledge node titles, content, and tags. The FTS index SHALL use the porter tokenizer for English stemming. Search queries SHALL support boolean operators (AND, OR, NOT) and phrase matching with double quotes.

#### Scenario: Searching with a simple query
- **WHEN** the user searches for "attention mechanism"
- **THEN** the FTS5 query returns all knowledge nodes containing "attention" or "mechanism" (or their stemmed forms), ranked by BM25 relevance

#### Scenario: Searching with boolean operators
- **WHEN** the user searches for "transformer AND NOT BERT"
- **THEN** the search returns nodes containing "transformer" but NOT "BERT", ranked by relevance

### Requirement: Hybrid Ranking with Reciprocal Rank Fusion
The system SHALL combine vector search and BM25 search results using Reciprocal Rank Fusion (RRF). The RRF formula SHALL be: `score = sum(1 / (k + rank_i))` for each result list, where `k = 60`. Results SHALL be re-ranked by the combined RRF score and returned with a unified relevance score.

#### Scenario: Hybrid search returns combined results
- **WHEN** the user performs a hybrid search for "neural network optimization"
- **THEN** the system runs both vector similarity search (top 20) and BM25 search (top 20), applies RRF to merge the ranked lists, and returns the top 20 results ordered by combined relevance score

#### Scenario: Results from only one search method
- **WHEN** a query returns results from vector search but none from BM25 (or vice versa)
- **THEN** the available results are returned with their single-method ranking; the RRF score is calculated from the available list only

### Requirement: Search API and UI Integration
The hybrid search SHALL be exposed as a unified API: `search(query, options)` where options include `domainId`, `limit`, `offset`, `filters` (tags, source, date range). The search UI SHALL display results with highlighted matching text, relevance score, and direct links to the knowledge node editor.

#### Scenario: Searching within a specific domain
- **WHEN** the user performs a search with the "Machine Learning" domain filter active
- **THEN** only knowledge nodes belonging to that domain are included in the search results

#### Scenario: Paginated search results
- **WHEN** a search returns more than 20 results
- **THEN** the first 20 results are displayed with a pagination control; clicking "Next" loads the next 20 results using the `offset` parameter
