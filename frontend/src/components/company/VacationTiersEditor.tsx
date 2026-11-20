import React from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { adminCellClass, adminHeadClass } from '../admin/AdminParts';
import {
  BC_ESA_TIERS,
  CA_SCHEDULE_TIERS,
  CompanyFormData,
  VacationTier,
  withUnionFlag,
} from './types';

interface VacationTiersEditorProps {
  formData: CompanyFormData;
  setFormData: (data: CompanyFormData) => void;
}

const VacationTiersEditor: React.FC<VacationTiersEditorProps> = ({ formData, setFormData }) => (
  <>
    {([false, true] as const).map((isUnion) => {
      const groupTiers = formData.vacation_percent_tiers
        .map((t, index) => ({ t, index }))
        .filter(({ t }) => !!t.union_member === isUnion);
      const title = isUnion ? 'Union members' : 'Non-union members';

      const replaceGroup = (nextGroup: VacationTier[]) => {
        const other = formData.vacation_percent_tiers.filter(
          (t) => !!t.union_member !== isUnion
        );
        setFormData({
          ...formData,
          vacation_percent_tiers: [
            ...other,
            ...nextGroup.map((t) => ({ ...t, union_member: isUnion })),
          ],
        });
      };

      const updateAtGlobal = (globalIndex: number, patch: Partial<VacationTier>) => {
        const tiers = [...formData.vacation_percent_tiers];
        tiers[globalIndex] = { ...tiers[globalIndex], ...patch, union_member: isUnion };
        setFormData({ ...formData, vacation_percent_tiers: tiers });
      };

      return (
        <div
          key={isUnion ? 'union' : 'non-union'}
          className="rounded-lg border border-solid border-border bg-card p-3"
        >
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h4 className="m-0 mr-1 text-sm font-semibold text-foreground">{title}</h4>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => replaceGroup(withUnionFlag([...BC_ESA_TIERS], isUnion))}
            >
              BC ESA (4% / 6%)
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => replaceGroup(withUnionFlag([...CA_SCHEDULE_TIERS], isUnion))}
            >
              CA Schedule (4/6/8/10%)
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                replaceGroup([
                  ...groupTiers.map(({ t }) => t),
                  { min_years: 0, max_years: null, percent: 4, union_member: isUnion },
                ])
              }
            >
              Add Tier
            </Button>
          </div>
          <div className="overflow-x-auto rounded-md border border-solid border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className={adminHeadClass}>Min years (inclusive)</TableHead>
                  <TableHead className={adminHeadClass}>Max years (exclusive, blank = open)</TableHead>
                  <TableHead className={adminHeadClass}>Vacation %</TableHead>
                  <TableHead className={`${adminHeadClass} w-14`} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupTiers.map(({ t: tier, index: idx }) => (
                  <TableRow key={`${isUnion}-${idx}`}>
                    <TableCell className={adminCellClass}>
                      <Input
                        type="number"
                        className="h-8 w-28 tabular-nums"
                        aria-label={`${title} minimum years`}
                        value={tier.min_years}
                        min={0}
                        step={0.5}
                        onChange={(e) =>
                          updateAtGlobal(idx, { min_years: Number(e.target.value) })
                        }
                      />
                    </TableCell>
                    <TableCell className={adminCellClass}>
                      <Input
                        type="number"
                        className="h-8 w-28 tabular-nums"
                        aria-label={`${title} maximum years`}
                        value={tier.max_years ?? ''}
                        placeholder="Open"
                        min={0}
                        step={0.5}
                        onChange={(e) => {
                          const v = e.target.value;
                          updateAtGlobal(idx, {
                            max_years: v === '' ? null : Number(v),
                          });
                        }}
                      />
                    </TableCell>
                    <TableCell className={adminCellClass}>
                      <Input
                        type="number"
                        className="h-8 w-28 tabular-nums"
                        aria-label={`${title} vacation percent`}
                        value={tier.percent}
                        min={0}
                        step={0.1}
                        onChange={(e) =>
                          updateAtGlobal(idx, { percent: Number(e.target.value) })
                        }
                      />
                    </TableCell>
                    <TableCell className={adminCellClass}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        aria-label="Remove tier"
                        disabled={groupTiers.length <= 1}
                        onClick={() =>
                          replaceGroup(groupTiers.filter(({ index }) => index !== idx).map(({ t }) => t))
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {groupTiers.length === 0 && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={4} className={`${adminCellClass} text-sm text-muted-foreground`}>
                      No tiers — BC ESA (4%/6%) will apply until you add a schedule.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      );
    })}
  </>
);

export default VacationTiersEditor;
