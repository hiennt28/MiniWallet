package com.miniwallet.demo;

import com.miniwallet.transaction.Category;
import com.miniwallet.transaction.Transaction;
import com.miniwallet.transaction.TransactionRepository;
import com.miniwallet.user.User;
import com.miniwallet.user.UserRepository;
import com.miniwallet.wallet.Wallet;
import com.miniwallet.wallet.WalletRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Tạo tài khoản demo (giống dữ liệu mẫu của frontend) khi khởi động, nếu chưa có:
 * <ul>
 *   <li>{@value #DEMO_PHONE} / PIN {@value #DEMO_PIN}, khoảng 60 ngày giao dịch</li>
 *   <li>4 người trong danh bạ, cũng là tài khoản thật (cùng PIN) để thử chuyển tiền qua lại</li>
 * </ul>
 * Dùng bộ sinh số ngẫu nhiên có seed cố định nên lần nào tạo cũng ra cùng một bộ dữ liệu.
 * Tắt bằng {@code DEMO_DATA=false}.
 */
@Component
@ConditionalOnProperty(name = "app.demo-data", havingValue = "true")
public class DemoDataSeeder implements ApplicationRunner {

    public static final String DEMO_PHONE = "0912345678";
    public static final String DEMO_PIN = "147258";
    static final long DEMO_BALANCE = 8_450_000;

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    private record Person(String name, String phone) {}

    private record Template(Category category, List<String> titles, int minThousand, int maxThousand, int weight) {}

    private static final Person DEMO = new Person("Nguyễn Văn An", DEMO_PHONE);

    private static final List<Person> CONTACTS = List.of(
            new Person("Trần Thị Bình", "0987654321"),
            new Person("Lê Minh Châu", "0356789012"),
            new Person("Phạm Quốc Dũng", "0778123456"),
            new Person("Hoàng Gia Hân", "0839876543"));

    private static final List<Template> EXPENSES = List.of(
            new Template(Category.FOOD, List.of("Quán phở đầu ngõ", "Cà phê sáng", "Cơm văn phòng", "Trà sữa", "Bánh mì"), 25, 180, 45),
            new Template(Category.TRANSPORT, List.of("Đặt xe đi làm", "Đổ xăng", "Vé xe buýt tháng", "Gửi xe"), 15, 250, 22),
            new Template(Category.SHOPPING, List.of("Siêu thị gần nhà", "Mua sách", "Quần áo", "Đồ gia dụng"), 120, 900, 14),
            new Template(Category.ENTERTAINMENT, List.of("Vé xem phim", "Gói nghe nhạc", "Đi chơi cuối tuần"), 60, 400, 10),
            new Template(Category.BILLS, List.of("Tiền điện", "Tiền nước", "Cước Internet", "Nạp tiền điện thoại"), 100, 650, 9));

    private final UserRepository users;
    private final WalletRepository wallets;
    private final TransactionRepository transactions;
    private final PasswordEncoder passwordEncoder;
    private final Clock clock;
    private final ZoneId zone;

    public DemoDataSeeder(UserRepository users, WalletRepository wallets, TransactionRepository transactions,
                          PasswordEncoder passwordEncoder, Clock clock, @Value("${app.time-zone}") ZoneId zone) {
        this.users = users;
        this.wallets = wallets;
        this.transactions = transactions;
        this.passwordEncoder = passwordEncoder;
        this.clock = clock;
        this.zone = zone;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (users.existsByPhone(DEMO_PHONE)) return;

        Instant now = clock.instant();
        String pinHash = passwordEncoder.encode(DEMO_PIN);

        for (Person contact : CONTACTS) {
            if (!users.existsByPhone(contact.phone())) {
                User user = users.save(User.register(contact.name(), contact.phone(), pinHash, now));
                wallets.save(Wallet.open(user, 2_000_000, now));
            }
        }

        User demo = users.save(User.register(DEMO.name(), DEMO.phone(), pinHash, now));
        Wallet wallet = wallets.save(Wallet.open(demo, DEMO_BALANCE, now));
        List<Transaction> history = generateHistory(wallet, now);
        transactions.saveAll(history);

        log.info("Đã tạo tài khoản demo {} (PIN {}) với {} giao dịch", DEMO_PHONE, DEMO_PIN, history.size());
    }

    private List<Transaction> generateHistory(Wallet wallet, Instant now) {
        Random random = new Random(2026);
        List<Transaction> result = new ArrayList<>();
        LocalDate today = LocalDate.ofInstant(now, zone);
        Instant latest = now.minusSeconds(60);

        for (int daysAgo = 59; daysAgo >= 0; daysAgo--) {
            LocalDate day = today.minusDays(daysAgo);

            if (day.getDayOfMonth() == 5) {
                result.add(Transaction.record(wallet, Category.SALARY, "Lương tháng", 15_000_000,
                        "Công ty chuyển lương", at(day, 9, 0, latest)));
            }

            int count = random.nextInt(3);
            for (int i = 0; i < count; i++) {
                Template t = pickWeighted(random);
                long amount = between(random, t.minThousand(), t.maxThousand()) * 1000L;
                result.add(Transaction.record(wallet, t.category(), pick(random, t.titles()), amount, null,
                        at(day, between(random, 7, 21), random.nextInt(60), latest)));
            }

            if (random.nextDouble() < 0.10) {
                Person c = pick(random, CONTACTS);
                result.add(Transaction.withCounterparty(wallet, Category.TRANSFER_IN, "Nhận tiền từ " + c.name(),
                        between(random, 5, 50) * 10_000L, pick(random, List.of("Trả tiền ăn trưa", "Gửi lại tiền", "Góp quỹ")),
                        c.phone(), at(day, between(random, 8, 22), random.nextInt(60), latest)));
            }

            if (random.nextDouble() < 0.08) {
                Person c = pick(random, CONTACTS);
                result.add(Transaction.withCounterparty(wallet, Category.TRANSFER_OUT, "Chuyển tiền đến " + c.name(),
                        between(random, 5, 80) * 10_000L, pick(random, List.of("Tiền sinh nhật", "Chia tiền đi chơi", "")),
                        c.phone(), at(day, between(random, 8, 22), random.nextInt(60), latest)));
            }
        }
        return result;
    }

    /** Thời điểm trong ngày theo giờ Việt Nam, không vượt quá hiện tại (cho các giao dịch "hôm nay"). */
    private Instant at(LocalDate day, int hour, int minute, Instant latest) {
        Instant time = day.atTime(hour, minute).atZone(zone).toInstant();
        return time.isAfter(latest) ? latest : time;
    }

    private static Template pickWeighted(Random random) {
        int total = EXPENSES.stream().mapToInt(Template::weight).sum();
        int r = random.nextInt(total);
        for (Template t : EXPENSES) {
            r -= t.weight();
            if (r < 0) return t;
        }
        return EXPENSES.getFirst();
    }

    private static <T> T pick(Random random, List<T> items) {
        return items.get(random.nextInt(items.size()));
    }

    private static int between(Random random, int min, int max) {
        return min + random.nextInt(max - min + 1);
    }
}
