{{/*
Create common labels for all kubernetes components
*/}}
{{- define "mclabels.selectorLabels" -}}
{{- end }}

{{/*
Create common labels for all kubernetes components
*/}}
{{- define "mclabels.labels" -}}
mapcolonies.io/environment: {{ include "environmentMerged" . }}
mapcolonies.io/part-of: {{ .Values.mclabels.partOf }}
mapcolonies.io/owner: {{ .Values.mclabels.owner }}
mapcolonies.io/component: {{ .Values.mclabels.component }}
mapcolonies.io/alloy-api-logs: {{ coalesce .Values.mclabels.logScraping "false" | quote }}
{{- if hasKey .Values.mclabels "gisDomain" }}
mapcolonies.io/gis-domain: {{ .Values.mclabels.gisDomain }}
{{- end -}}
{{- end }}

{{/*
Create common annotations for all kubernetes components
*/}}
{{- define "mclabels.annotations" -}}
{{- if and (hasKey .Values.mclabels "prometheus") .Values.mclabels.prometheus.enabled }}
prometheus.io/scrape: "true"
prometheus.io/port: {{ coalesce .Values.mclabels.prometheus.port "8080" | quote }}
prometheus.io/path: {{ coalesce .Values.mclabels.prometheus.path "/metrics" | quote }}
{{- end }}
{{- end }}
