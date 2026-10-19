-- ============================================================================
-- SCHEMA DE BANCO DE DADOS: RetencaoProAnalysis
-- Sistema: BomProjeto
-- Tabela: retencao_pro_analyses
--
-- REQUISITO: Isolamento Estrito de Dados
-- O campo 'project_id' é chave obrigatória e indexada.
-- Cada análise pertence exclusivamente a um único projeto.
-- ============================================================================

-- 1. Definição SQL (PostgreSQL / CockroachDB / Cloud SQL)
CREATE TABLE IF NOT EXISTS retencao_pro_analyses (
  id VARCHAR(64) PRIMARY KEY,
  project_id VARCHAR(64) NOT NULL UNIQUE,
  workspace_id VARCHAR(64),
  happiness_score INTEGER NOT NULL CHECK (happiness_score >= 0 AND happiness_score <= 100),
  churn_risk VARCHAR(16) NOT NULL CHECK (churn_risk IN ('BAIXO', 'MEDIO', 'CRITICO')),
  pillars JSONB NOT NULL,
  positive_words JSONB NOT NULL,
  negative_words JSONB NOT NULL,
  prescriptive_actions JSONB NOT NULL,
  ai_model VARCHAR(64) NOT NULL DEFAULT 'gemini-3.8-flash',
  analyzed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_retencao_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Índice obrigatório e único por projeto para isolamento estrito e buscas O(1)
CREATE UNIQUE INDEX IF NOT EXISTS idx_retencao_pro_project_id ON retencao_pro_analyses(project_id);
CREATE INDEX IF NOT EXISTS idx_retencao_pro_churn_risk ON retencao_pro_analyses(churn_risk);
CREATE INDEX IF NOT EXISTS idx_retencao_pro_analyzed_at ON retencao_pro_analyses(analyzed_at DESC);

-- ============================================================================
-- 2. Schema Prisma Equivalente (prisma/schema.prisma)
-- ============================================================================
/*
model RetencaoProAnalysis {
  id                  String   @id @default(uuid())
  projectId           String   @unique @map("project_id")
  workspaceId         String?  @map("workspace_id")
  happinessScore      Int      @map("happiness_score")
  churnRisk           String   @map("churn_risk") // 'BAIXO' | 'MEDIO' | 'CRITICO'
  pillars             Json     // { communicationFriction, operationalReliability, perceivedValue, contractualRisk }
  positiveWords       Json     @map("positive_words")      // Array<{ text, count, sentimentWeight }>
  negativeWords       Json     @map("negative_words")      // Array<{ text, count, sentimentWeight }>
  prescriptiveActions Json     @map("prescriptive_actions") // Array<{ priority, diagnosis, action, whatsappTemplate }>
  aiModel             String   @default("gemini-3.8-flash") @map("ai_model")
  analyzedAt          DateTime @default(now()) @map("analyzed_at")
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")

  @@index([projectId], name: "idx_retencao_pro_project_id")
  @@map("retencao_pro_analyses")
}
*/
