// Package skills provides API types and handlers for the dev.toolhive/skills
// extension endpoints (THV-0029).
package skills

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"gopkg.in/yaml.v3"

	"github.com/stacklok/toolhive-registry-server/internal/api/common"
	"github.com/stacklok/toolhive-registry-server/internal/auth"
	"github.com/stacklok/toolhive-registry-server/internal/service"
)

// downloadLatestSkill handles
// GET /registry/{registryName}/v0.1/x/dev.toolhive/skills/{namespace}/{name}/download
// and returns a synthesized zip of the latest skill version.
func (routes *Routes) downloadLatestSkill(w http.ResponseWriter, r *http.Request) {
	routes.downloadSkill(w, r, "latest")
}

// downloadSkillVersion handles
// GET /registry/{registryName}/v0.1/x/dev.toolhive/skills/{namespace}/{name}/versions/{version}/download
// and returns a synthesized zip of the requested skill version.
func (routes *Routes) downloadSkillVersion(w http.ResponseWriter, r *http.Request) {
	routes.downloadSkill(w, r, chi.URLParam(r, "version"))
}

// downloadSkill fetches the requested skill version and streams back a zip
// archive containing a SKILL.md (YAML frontmatter + description body) and a
// manifest.json carrying the platform metadata. This mirrors the export
// behavior the platform UI expects (previously prototyped in the mock backend).
func (routes *Routes) downloadSkill(w http.ResponseWriter, r *http.Request, version string) {
	registryName, err := common.GetAndValidateURLParam(r, "registryName")
	if err != nil {
		common.WriteErrorResponse(w, err.Error(), http.StatusBadRequest)
		return
	}
	namespace, err := common.GetAndValidateURLParam(r, "namespace")
	if err != nil {
		common.WriteErrorResponse(w, err.Error(), http.StatusBadRequest)
		return
	}
	name, err := common.GetAndValidateURLParam(r, "name")
	if err != nil {
		common.WriteErrorResponse(w, err.Error(), http.StatusBadRequest)
		return
	}

	opts := []service.Option{
		service.WithRegistryName(registryName),
		service.WithNamespace(namespace),
		service.WithName(name),
		service.WithVersion(version),
	}
	if jwtClaims := auth.ClaimsFromContext(r.Context()); jwtClaims != nil {
		opts = append(opts, service.WithClaims(map[string]any(jwtClaims)))
	}

	skill, err := routes.service.GetSkillVersion(r.Context(), opts...)
	if err != nil {
		writeServiceError(w, r, err)
		return
	}

	data, err := buildSkillZip(skill)
	if err != nil {
		slog.ErrorContext(r.Context(), "failed to synthesize skill zip", "error", err)
		common.WriteErrorResponse(w, "internal server error", http.StatusInternalServerError)
		return
	}

	filename := fmt.Sprintf("%s-%s.zip", skill.Name, skill.Version)
	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", filename))
	w.WriteHeader(http.StatusOK)
	if _, err := w.Write(data); err != nil {
		slog.ErrorContext(r.Context(), "failed to write skill zip response", "error", err)
	}
}

// buildSkillZip assembles the in-memory zip archive for a skill.
func buildSkillZip(skill *service.Skill) ([]byte, error) {
	skillMd, err := renderSkillMarkdown(skill)
	if err != nil {
		return nil, err
	}
	manifest, err := json.MarshalIndent(skill, "", "  ")
	if err != nil {
		return nil, err
	}

	buf := &bytes.Buffer{}
	zw := zip.NewWriter(buf)
	if err := writeZipEntry(zw, "SKILL.md", skillMd); err != nil {
		return nil, err
	}
	if err := writeZipEntry(zw, "manifest.json", manifest); err != nil {
		return nil, err
	}
	if err := zw.Close(); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// writeZipEntry writes a single file into the zip writer.
func writeZipEntry(zw *zip.Writer, name string, content []byte) error {
	f, err := zw.Create(name)
	if err != nil {
		return err
	}
	_, err = f.Write(content)
	return err
}

// renderSkillMarkdown renders a SKILL.md document with a YAML frontmatter block
// (name + description and commonly useful metadata) followed by the description
// as the document body.
func renderSkillMarkdown(skill *service.Skill) ([]byte, error) {
	type frontmatter struct {
		Name          string   `yaml:"name"`
		Description   string   `yaml:"description"`
		Version       string   `yaml:"version,omitempty"`
		Namespace     string   `yaml:"namespace,omitempty"`
		License       string   `yaml:"license,omitempty"`
		Compatibility string   `yaml:"compatibility,omitempty"`
		AllowedTools  []string `yaml:"allowedTools,omitempty"`
	}

	fm := frontmatter{
		Name:          skill.Name,
		Description:   skill.Description,
		Version:       skill.Version,
		Namespace:     skill.Namespace,
		License:       skill.License,
		Compatibility: skill.Compatibility,
		AllowedTools:  skill.AllowedTools,
	}

	yamlFm, err := yaml.Marshal(fm)
	if err != nil {
		return nil, err
	}

	var sb strings.Builder
	sb.WriteString("---\n")
	sb.Write(yamlFm)
	sb.WriteString("---\n\n")
	if skill.Description != "" {
		sb.WriteString(skill.Description)
		sb.WriteString("\n")
	}
	return []byte(sb.String()), nil
}
