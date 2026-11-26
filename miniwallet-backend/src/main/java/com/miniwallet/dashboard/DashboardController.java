package com.miniwallet.dashboard;

import com.miniwallet.common.security.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.YearMonth;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@Tag(name = "Dashboard", description = "Tổng quan theo tháng")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping
    @Operation(summary = "Số dư, tổng thu/chi trong tháng, chi tiêu theo danh mục, 5 giao dịch gần nhất")
    public DashboardResponse get(
            @AuthenticationPrincipal AuthenticatedUser user,
            @Parameter(description = "Tháng dạng yyyy-MM, mặc định tháng hiện tại (giờ Việt Nam)", example = "2026-11")
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM") YearMonth month) {
        return dashboardService.getDashboard(user.id(), month);
    }
}
