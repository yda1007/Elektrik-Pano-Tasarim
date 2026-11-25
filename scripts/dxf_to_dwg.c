/*
 * Bemis BH6-6000-0000 Elektrik Pano Projesi
 * Minimal, spec-compliant ASCII DXF (LAYER, LINE, CIRCLE, TEXT) -> AutoCAD R2000 (AC1015) binary DWG converter
 * Built against GNU LibreDWG C API (dwg_api.h).
 */

#include <ctype.h>
#include <math.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "dwg.h"
#include "dwg_api.h"

#ifndef M_PI
#  define M_PI 3.14159265358979323846
#endif

typedef struct
{
  char name[128];
  uint64_t absref;
} LayerCache;

static LayerCache g_layers[128];
static int g_num_layers = 0;

static void
trim_eol (char *s)
{
  size_t n = strlen (s);
  while (n > 0 && (s[n - 1] == '\r' || s[n - 1] == '\n'))
    s[--n] = '\0';
}

static char *
trim_ws (char *s)
{
  while (*s && isspace ((unsigned char)*s))
    s++;
  size_t n = strlen (s);
  while (n > 0 && isspace ((unsigned char)s[n - 1]))
    s[--n] = '\0';
  return s;
}

static int
read_pair (FILE *fp, int *code_out, char *val_out, size_t val_sz)
{
  char line[1024];
  if (!fgets (line, sizeof (line), fp))
    return 0;
  trim_eol (line);
  char *c = trim_ws (line);
  *code_out = atoi (c);
  if (!fgets (val_out, (int)val_sz, fp))
    return 0;
  trim_eol (val_out);
  return 1;
}

static uint64_t
find_layer_absref (Dwg_Data *dwg, const char *name)
{
  if (!name || !*name)
    return 0x10; /* Layer "0" */
  for (int i = 0; i < g_num_layers; i++)
    {
      if (strcmp (g_layers[i].name, name) == 0)
        return g_layers[i].absref;
    }
  BITCODE_H h = dwg_find_tablehandle (dwg, name, "LAYER");
  if (h)
    return h->absolute_ref;
  return 0x10;
}

static void
ensure_layer (Dwg_Data *dwg, const char *name, int color_aci)
{
  if (!name || !*name || strcmp (name, "0") == 0)
    return;
  for (int i = 0; i < g_num_layers; i++)
    {
      if (strcmp (g_layers[i].name, name) == 0)
        return;
    }
  Dwg_Object_LAYER *ly = dwg_add_LAYER (dwg, name);
  if (!ly)
    return;
  ly->color.index = (BITCODE_BS)(color_aci > 0 ? color_aci : 7);
  ly->plotflag = 1;
  ly->off = 0;
  ly->frozen = 0;
  ly->locked = 0;
  if (dwg->header_vars.LTYPE_CONTINUOUS)
    ly->ltype = dwg_add_handleref (
        dwg, 5, dwg->header_vars.LTYPE_CONTINUOUS->absolute_ref, NULL);
  else
    ly->ltype = dwg_add_handleref (dwg, 5, UINT64_C (0x16), NULL);

  BITCODE_H h = dwg_find_tablehandle (dwg, name, "LAYER");
  if (h && g_num_layers < 128)
    {
      snprintf (g_layers[g_num_layers].name,
                sizeof (g_layers[g_num_layers].name), "%s", name);
      g_layers[g_num_layers].absref = h->absolute_ref;
      g_num_layers++;
    }
}

typedef struct
{
  char kind[32];
  char layer[128];
  char name[128];
  char text[1024];
  int has_color;
  int color;
  double x1, y1, z1;
  double x2, y2, z2;
  double r;
  double height;
  double rot_deg;
} DxfItem;

static void
reset_item (DxfItem *it, const char *kind)
{
  memset (it, 0, sizeof (*it));
  snprintf (it->kind, sizeof (it->kind), "%s", kind);
  snprintf (it->layer, sizeof (it->layer), "0");
  it->color = 256;
}

static double g_min_x = 1e30, g_min_y = 1e30, g_max_x = -1e30, g_max_y = -1e30;
static int g_cnt_layer = 0, g_cnt_line = 0, g_cnt_circle = 0, g_cnt_text = 0;

static void
update_bounds (double x, double y)
{
  if (x < g_min_x)
    g_min_x = x;
  if (y < g_min_y)
    g_min_y = y;
  if (x > g_max_x)
    g_max_x = x;
  if (y > g_max_y)
    g_max_y = y;
}

static void
set_common_props (Dwg_Data *dwg, Dwg_Object_Entity *ent, const char *layer,
                  int has_color, int color)
{
  if (!ent)
    return;
  uint64_t lref = find_layer_absref (dwg, layer);
  ent->layer = dwg_add_handleref (dwg, 5, lref, NULL);
  ent->color.index = (BITCODE_BS)(has_color && color > 0 ? color : 256);
}

static void
flush_item (Dwg_Data *dwg, Dwg_Object_BLOCK_HEADER *hdr, const char *section,
            const DxfItem *it)
{
  if (!it->kind[0])
    return;

  if (strcmp (section, "TABLES") == 0 && strcmp (it->kind, "LAYER") == 0)
    {
      ensure_layer (dwg, it->name, it->has_color ? it->color : 7);
      g_cnt_layer++;
      return;
    }

  if (strcmp (section, "ENTITIES") != 0)
    return;

  if (strcmp (it->kind, "LINE") == 0)
    {
      dwg_point_3d p1 = { it->x1, it->y1, it->z1 };
      dwg_point_3d p2 = { it->x2, it->y2, it->z2 };
      Dwg_Entity_LINE *ln = dwg_add_LINE (hdr, &p1, &p2);
      if (ln)
        {
          set_common_props (dwg, ln->parent, it->layer, it->has_color,
                            it->color);
          update_bounds (it->x1, it->y1);
          update_bounds (it->x2, it->y2);
          g_cnt_line++;
        }
    }
  else if (strcmp (it->kind, "CIRCLE") == 0)
    {
      dwg_point_3d c = { it->x1, it->y1, it->z1 };
      Dwg_Entity_CIRCLE *ci = dwg_add_CIRCLE (hdr, &c, it->r);
      if (ci)
        {
          set_common_props (dwg, ci->parent, it->layer, it->has_color,
                            it->color);
          update_bounds (it->x1 - it->r, it->y1 - it->r);
          update_bounds (it->x1 + it->r, it->y1 + it->r);
          g_cnt_circle++;
        }
    }
  else if (strcmp (it->kind, "TEXT") == 0)
    {
      dwg_point_3d p = { it->x1, it->y1, it->z1 };
      double h = it->height > 0.0 ? it->height : 4.0;
      Dwg_Entity_TEXT *tx = dwg_add_TEXT (hdr, it->text, &p, h);
      if (tx)
        {
          tx->width_factor = 1.0;
          tx->rotation = it->rot_deg * M_PI / 180.0;
          set_common_props (dwg, tx->parent, it->layer, it->has_color,
                            it->color);
          update_bounds (it->x1, it->y1);
          g_cnt_text++;
        }
    }
}

int
main (int argc, char **argv)
{
  if (argc != 3)
    {
      fprintf (stderr, "Usage: %s <input.dxf> <output.dwg>\n", argv[0]);
      return 1;
    }

  FILE *fp = fopen (argv[1], "rb");
  if (!fp)
    {
      perror ("fopen input.dxf");
      return 1;
    }

  Dwg_Data *dwg = dwg_new_Document (R_2000, 0, 0);
  if (!dwg)
    {
      fprintf (stderr, "dwg_new_Document failed\n");
      fclose (fp);
      return 1;
    }

  Dwg_Object *mspace = dwg_model_space_object (dwg);
  if (!mspace)
    {
      fprintf (stderr, "dwg_model_space_object failed\n");
      dwg_free (dwg);
      fclose (fp);
      return 1;
    }
  Dwg_Object_BLOCK_HEADER *hdr = mspace->tio.object->tio.BLOCK_HEADER;
  dwg->header_vars.INSUNITS = 4; /* Millimeters */

  char section[64] = "";
  int expect_section_name = 0;
  DxfItem cur;
  memset (&cur, 0, sizeof (cur));

  int code = 0;
  char val[1024];
  while (read_pair (fp, &code, val, sizeof (val)))
    {
      if (code == 0)
        {
          flush_item (dwg, hdr, section, &cur);
          memset (&cur, 0, sizeof (cur));
          char *k = trim_ws (val);
          if (strcmp (k, "SECTION") == 0)
            {
              expect_section_name = 1;
              section[0] = '\0';
            }
          else if (strcmp (k, "ENDSEC") == 0)
            {
              section[0] = '\0';
            }
          else if (strcmp (k, "EOF") == 0)
            {
              break;
            }
          else if (strcmp (section, "TABLES") == 0
                   && strcmp (k, "LAYER") == 0)
            {
              reset_item (&cur, "LAYER");
            }
          else if (strcmp (section, "ENTITIES") == 0
                   && (strcmp (k, "LINE") == 0 || strcmp (k, "CIRCLE") == 0
                       || strcmp (k, "TEXT") == 0))
            {
              reset_item (&cur, k);
            }
        }
      else if (expect_section_name && code == 2)
        {
          snprintf (section, sizeof (section), "%s", trim_ws (val));
          expect_section_name = 0;
        }
      else if (cur.kind[0])
        {
          switch (code)
            {
            case 1:
              snprintf (cur.text, sizeof (cur.text), "%s", val);
              break;
            case 2:
              snprintf (cur.name, sizeof (cur.name), "%s", trim_ws (val));
              break;
            case 8:
              snprintf (cur.layer, sizeof (cur.layer), "%s", trim_ws (val));
              break;
            case 10:
              cur.x1 = atof (val);
              break;
            case 20:
              cur.y1 = atof (val);
              break;
            case 30:
              cur.z1 = atof (val);
              break;
            case 11:
              cur.x2 = atof (val);
              break;
            case 21:
              cur.y2 = atof (val);
              break;
            case 31:
              cur.z2 = atof (val);
              break;
            case 40:
              cur.r = atof (val);
              cur.height = atof (val);
              break;
            case 50:
              cur.rot_deg = atof (val);
              break;
            case 62:
              cur.has_color = 1;
              cur.color = atoi (val);
              break;
            default:
              break;
            }
        }
    }
  flush_item (dwg, hdr, section, &cur);
  fclose (fp);

  if (g_min_x < g_max_x && g_min_y < g_max_y)
    {
      dwg->header_vars.EXTMIN.x = g_min_x;
      dwg->header_vars.EXTMIN.y = g_min_y;
      dwg->header_vars.EXTMIN.z = 0.0;
      dwg->header_vars.EXTMAX.x = g_max_x;
      dwg->header_vars.EXTMAX.y = g_max_y;
      dwg->header_vars.EXTMAX.z = 0.0;
      dwg->header_vars.LIMMIN.x = g_min_x;
      dwg->header_vars.LIMMIN.y = g_min_y;
      dwg->header_vars.LIMMAX.x = g_max_x;
      dwg->header_vars.LIMMAX.y = g_max_y;
    }

  remove (argv[2]);
  int err = dwg_write_file (argv[2], dwg);
  dwg_free (dwg);

  if (err >= DWG_ERR_CRITICAL)
    {
      fprintf (stderr, "dwg_write_file failed with error 0x%x\n", err);
      return 2;
    }

  printf ("DWG written: %s (layers=%d, lines=%d, circles=%d, texts=%d, err=0x%x)\n",
          argv[2], g_cnt_layer, g_cnt_line, g_cnt_circle, g_cnt_text, err);
  return 0;
}
