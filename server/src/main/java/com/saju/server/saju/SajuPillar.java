package com.saju.server.saju;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SajuPillar {
    private int stemIndex;      // 천간 index (0-9)
    private int branchIndex;    // 지지 index (0-11)

    public String getStemName() {
        return SajuConstants.CHEONGAN[stemIndex];
    }

    public String getBranchName() {
        return SajuConstants.JIJI[branchIndex];
    }

    public String getStemHanja() {
        return SajuConstants.CHEONGAN_HANJA[stemIndex];
    }

    public String getBranchHanja() {
        return SajuConstants.JIJI_HANJA[branchIndex];
    }

    public String getFullName() {
        return getStemName() + getBranchName();
    }

    public String getFullHanja() {
        return getStemHanja() + getBranchHanja();
    }

    public int getStemElement() {
        return SajuConstants.CHEONGAN_OHENG[stemIndex];
    }

    public int getBranchElement() {
        return SajuConstants.JIJI_OHENG[branchIndex];
    }

    public String getStemElementName() {
        return SajuConstants.OHENG[getStemElement()];
    }

    public String getBranchElementName() {
        return SajuConstants.OHENG[getBranchElement()];
    }

    public boolean isStemYang() {
        return SajuConstants.CHEONGAN_YINYANG[stemIndex] == 0;
    }

    public String getAnimal() {
        return SajuConstants.JIJI_ANIMAL[branchIndex];
    }
}
